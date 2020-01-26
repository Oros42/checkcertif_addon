"use strict";

function updateTabStatus(tabId, status, urlDomain){
  if(tabs[tabId]["status"] <= status) {
    tabs[tabId]["status"] = status;
    if(urlDomain != "") {
      tabs[tabId]["urls"][urlDomain]["status"] = status;
    }
    browser.browserAction.setIcon({tabId:tabId, path: "icons/"+tabStatus[status]['img']});
    browser.browserAction.setTitle({tabId:tabId, title: tabStatus[status]['msg']});//TODO add more infos
  }
}

function checkCDN(ip){
  //TODO detect CloudFlare and other CDN
}

function isBlacklisted(ip, urlDomain){
  for (var i in blacklistIp) {
    if(ip.search(blacklistIp[i]) != -1) {
      return true;
    }
  }
  for (var i in blacklistHosts) {
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

  checkCDN(details.ip);

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
      if(!checkFromCache(tabId, urlDomain, localSha1, localSha256)) {
        //If not in cache
        //FIXME check if checkcertifServers is not empity
        for(let srvId in checkcertifServers){
          if (checkcertifServers[srvId].enable) {
              if(isBlacklisted(details.ip, urlDomain)) {
                updateTabStatus(tabId, tabStatusBlacklisted, urlDomain);
              } else {
                getCertif(srvId, urlDomain, tabId);
              }
          }
        }
      }else{
        let r = window.crypto.getRandomValues(new Uint8Array(1))[0] / 2**8;
        if(r > 0.7){ //FIXME
          // if in cache
          // then sand fake domain random query
          let r2 = window.crypto.getRandomValues(new Uint8Array(1))[0] / 2**8;
          r2 = parseInt(r2 * domainsListLength);
          let urlDomainFake = 'https://' + domainsList[r2];
          for(let srvId in checkcertifServers){
            sendMessage(checkcertifServers[srvId], {'url':urlDomainFake});
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