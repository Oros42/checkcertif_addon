"use strict";

function updateTabStatus(tabId, status, urlDomain){
  if(tabs[tabId]["status"] <= status) {
    tabs[tabId]["status"] = status;
    if(urlDomain != "") {
      if(!(urlDomain in tabs[tabId]["urls"])) {
        tabs[tabId]["urls"][urlDomain] = { 'status':'','urls':[]};
      }
      tabs[tabId]["urls"][urlDomain]["status"] = status;
    }
    browser.browserAction.setIcon({tabId:tabId, path: "icons/"+tabStatus[status]['img']});
    browser.browserAction.setTitle({tabId:tabId, title: tabStatus[status]['msg']});//TODO add more infos
  }
}

function checkCDN(tabId, securityInfo, urlDomain, ip){
  let sI = securityInfo.certificates[0];
  if(sI.subject.toLowerCase().indexOf('cloudflare') > 0
    || sI.issuer.toLowerCase().indexOf('cloudflare') > 0) {
    rootCertStats[urlDomain]['cdn'] = "CloudFlare";
    updateTabStatus(tabId, tabStatusDangerCDN, urlDomain);
  }
}

function isBlacklisted(ip, urlDomain){
  if(ip == null) {
    return true;
  }
  for (let i in blacklistIp) {
    if(ip.search(blacklistIp[i]) != -1) {
      return true;
    }
  }
  for (let i in blacklistHosts) {
    if(ip.search(blacklistHosts[i]) != -1) {
      return true;
    }
  }
  return false;
}





/*
 * return true if in cache
 */
function checkFromCache(tabId, urlDomain, sha1, sha256){
  if(urlDomain in rootCertStats) {
    if(Object.keys(rootCertStats[urlDomain]["remote"]).length !== 0) {
      if(rootCertStats[urlDomain]["cdn"].length > 0){
        updateTabStatus(tabId, tabStatusDangerCDN, urlDomain);
      }
      for(let srvId in rootCertStats[urlDomain]["remote"]){
        if(rootCertStats[urlDomain]["remote"][srvId]["sha1"] == ""
            && rootCertStats[urlDomain]["remote"][srvId]["sha256"] == ""){
          return true;
        }
        if(rootCertStats[urlDomain]["remote"][srvId]["sha1"] !== sha1){
          updateTabStatus(tabId, tabStatusDanger, urlDomain);
          return true;
        }
        if(rootCertStats[urlDomain]["remote"][srvId]["sha256"] !== sha256){
          updateTabStatus(tabId, tabStatusDanger, urlDomain);
          return true;
        }
      }
      updateTabStatus(tabId, tabStatusOk, urlDomain);
      return true;
    }else{
      return false;
    }
  }else{
    return false;
  }
}



async function getCertif(srvId, urlDomain, tabId) {
  if(!(srvId in rootCertStats[urlDomain]["remote"])){
    rootCertStats[urlDomain]["remote"][srvId] = {
      "sha1":"",
      "sha256":""
    };
  }

  var responseArray = await sendMessage(checkcertifServers[srvId], {'url':urlDomain});
  if(responseArray['status']) {
    let clearResponse = responseArray['message'];
    let level = tabStatusOk;

    if(1 in clearResponse){
      rootCertStats[urlDomain]["remote"][srvId]["sha1"] = clearResponse[1];
      if(rootCertStats[urlDomain]['localSha1'] !== clearResponse[1]) {
        level = tabStatusDanger;
      }
    }else{
      level = tabStatusDanger;
    }

    if(2 in clearResponse){
      rootCertStats[urlDomain]["remote"][srvId]["sha256"] = clearResponse[2];
      if(rootCertStats[urlDomain]['localSha256'] !== clearResponse[2]) {
        level = tabStatusDanger;
      }
    }else{
      level = tabStatusDanger;
    }

    updateTabStatus(tabId, level, urlDomain);
  }else{
    updateTabStatus(tabId, tabStatusDanger, urlDomain);
  }
}

var creditForNewCall = 5;
async function checkHeader(details) {
  if(! 'tabId' in  details || details.tabId < 0){
    return;
  }
  let tabId = details.tabId;
  let fullUrl = details.url;
	let urlDomain = new URL(details.url).origin;

  if(! (tabId in tabs) ) {
    tabs[tabId] = {
      "status": tabStatusWait,
      "urls": {}
    };
    updateTabStatus(tabId, tabStatusWait, urlDomain);
  }
  if(! (urlDomain in tabs[tabId]["urls"]) ) {
    tabs[tabId]["urls"][urlDomain] = {
      "status":null,
      "urls":[]
    };
  }
  if(tabs[tabId]["urls"][urlDomain]["urls"].indexOf(fullUrl) === -1) {
    tabs[tabId]["urls"][urlDomain]["urls"].push(fullUrl);
  }

  if(!(urlDomain in rootCertStats)){
    rootCertStats[urlDomain] = {
      "status": "",//TODO
      "create": Date.now(),//TODO
      "localSha1": "",
      "localSha256": "",
      "securityInfo": null,
      "remote": {},
      "cdn": "",//TODO
      "ip":[]
    };
  }

  if(details.ip != null && rootCertStats[urlDomain].ip.indexOf(details.ip) == -1){
    rootCertStats[urlDomain].ip.push(details.ip);
  }


  try{
    var securityInfo = await browser.webRequest.getSecurityInfo(
      details.requestId,
      {"certificateChain": true}
    );
  }catch(error) {
    //TODO
    updateTabStatus(tabId, tabStatusDanger, urlDomain);
  }

  if(securityInfo.state == "insecure") {
    updateTabStatus(tabId, tabStatusDanger, urlDomain);
  }else{
    let localSha1 = '';
    let localSha256 = '';
    if(0 in securityInfo.certificates) {
      localSha1 = securityInfo.certificates[0].fingerprint.sha1.replace(/:/gi, "").toLowerCase();
      localSha256 = securityInfo.certificates[0].fingerprint.sha256.replace(/:/gi, "").toLowerCase();
    }

    rootCertStats[urlDomain].localSha1 = localSha1;
    rootCertStats[urlDomain].localSha256 = localSha256;
    rootCertStats[urlDomain].securityInfo = securityInfo;

    if(localSha1 == '' || localSha256 == '') {
      updateTabStatus(tabId, tabStatusDanger, urlDomain);
      return;
    } else {
      if(checkFromCache(tabId, urlDomain, localSha1, localSha256)) {
        // if in cache
        if(!isBlacklisted(details.ip, urlDomain)) {
          // and not blacklisted
  
          checkCDN(tabId, securityInfo, urlDomain, details.ip);

          let r = window.crypto.getRandomValues(new Uint8Array(1))[0] / 2**8;
          if(r > 0.7 && creditForNewCall > 0){ //FIXME
            creditForNewCall = creditForNewCall - 1; // to avoid too much call
            // then send a random domain
            let r2 = window.crypto.getRandomValues(new Uint8Array(1))[0] / 2**8;
            r2 = parseInt(r2 * domainsListLength);
            let urlDomainFake = 'https://' + domainsList[r2];
            for(let srvId in checkcertifServers){
              sendMessage(checkcertifServers[srvId], {'url':urlDomainFake});
            }
          }
        }
      }else{
        // if not in cache
        if(isBlacklisted(details.ip, urlDomain)) {
          updateTabStatus(tabId, tabStatusBlacklisted, urlDomain);
        }else {
          checkCDN(tabId, securityInfo, urlDomain, details.ip);

          let r = window.crypto.getRandomValues(new Uint8Array(1))[0] / 2**8;
          creditForNewCall = parseInt(r * 10);
          for(let srvId in checkcertifServers){
            // call each server to check the certificat
            getCertif(srvId, urlDomain, tabId);
          }
        }
      }
    }
  }
}

browser.webRequest.onHeadersReceived.addListener(checkHeader,
  {
    urls: ["<all_urls>"]
  },
  ["blocking"]
);


function resetTabStatus(tabId, changeInfo, tabInfo) {
  if (changeInfo.url) {
    let urlDomain = new URL(changeInfo.url).origin;
    tabs[tabId] = {
      "status": tabStatusWait,
      "urls": {}
    };
    tabs[tabId]["urls"][urlDomain] = {
      "status":null,
      "urls":[]
    };
    updateTabStatus(tabId, tabStatusWait, urlDomain);
  }
}

browser.tabs.onUpdated.addListener(resetTabStatus);