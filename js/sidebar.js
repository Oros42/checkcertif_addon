var myWindowId;

function updateContent() {
  browser.tabs.query({windowId: myWindowId, active: true})
  .then((tabs) => {
    let tabId = tabs[0].id;
    browser.runtime.getBackgroundPage().then(
      (page) => {
        tabStatus.innerHTML = "";
        tabUrl.innerHTML = "";
        if( tabId in page.tabs) {
          tabStatus.innerHTML = page.tabStatus[page.tabs[tabId].status].msg;
          let cptId = 0;
          for(let urlDomain in page.tabs[tabId].urls) {
            let domain = page.tabs[tabId].urls[urlDomain];
            let urls = domain.urls;
            let div = document.createElement("div");


            // title
            let span = document.createElement("span");
            if(domain.status && domain.status in page.tabStatus) {
              span.innerHTML = page.tabStatus[domain.status].icon;
            } else {
              span.innerHTML = "?";
            }
            span.innerHTML += " "+urlDomain;
            if(urlDomain in page.rootCertStats) {
              span.innerHTML += " ("+page.rootCertStats[urlDomain].ip.join(', ')+")";
              div.appendChild(span);
            }


            // urls
            let divUrls = document.createElement("div");
           
            let aUrls = document.createElement("a");
            let cptUrl = urls.length;
            aUrls.innerHTML = cptUrl+" url"+(cptUrl>1?"s":"");
            aUrls.href="#";
            aUrls.addEventListener("click", function(){
              this.nextElementSibling.hidden = !this.nextElementSibling.hidden;
            });
            divUrls.appendChild(aUrls);

            let ulUrls = document.createElement("ul");
            ulUrls.id = `ul_${cptId}`;
            ulUrls.hidden = true;
            for(let u in urls) {
              let liUrl = document.createElement("li");
              liUrl.innerHTML = urls[u];
              ulUrls.appendChild(liUrl);
            }
            divUrls.appendChild(ulUrls);
            div.appendChild(divUrls);


            if(urlDomain in page.rootCertStats) {
              let certif = page.rootCertStats[urlDomain];

              // Certif
              if(certif.securityInfo) {
                let certifDiv = document.createElement("div");

                let aCertif = document.createElement("a");
                aCertif.innerHTML = "Certif";
                aCertif.href="#";
                aCertif.addEventListener("click", function(){
                  this.nextElementSibling.hidden = !this.nextElementSibling.hidden;
                });
                certifDiv.appendChild(aCertif);

                let sI = certif.securityInfo.certificates[0];
                let validityStart = new Date(sI.validity.start).toLocaleString();
                let validityEnd = new Date(sI.validity.end).toLocaleString();
                let certifDiv2 = document.createElement("div");
                certifDiv2.innerHTML = 
                `state: ${certif.securityInfo.state}<br>
                isUntrusted: ${certif.securityInfo.isUntrusted}<br>
                subject: ${sI.subject}<br>
                issuer: ${sI.issuer}<br>
                serial number: ${sI.serialNumber}<br>
                sha1: ${sI.fingerprint.sha1}<br>
                sha256: ${sI.fingerprint.sha256}<br>
                validity start: ${validityStart}<br>
                validity end: ${validityEnd}<br>
                
                cipherSuite: ${certif.securityInfo.cipherSuite}<br>
                protocolVersion: ${certif.securityInfo.protocolVersion}<br>
                signatureSchemeName: ${certif.securityInfo.signatureSchemeName}<br>
                hpkp: ${certif.securityInfo.hpkp}<br>
                hsts: ${certif.securityInfo.hsts}<br>
                isDomainMismatch: ${certif.securityInfo.isDomainMismatch}<br>
                isExtendedValidation: ${certif.securityInfo.isExtendedValidation}<br>
                isNotValidAtThisTime: ${certif.securityInfo.isNotValidAtThisTime}`;
                certifDiv2.hidden = true;
                certifDiv.appendChild(certifDiv2);
                div.appendChild(certifDiv);
              }


              // Hashs
              let hashsDiv = document.createElement("div");

              let aHashs = document.createElement("a");
              aHashs.innerHTML = "Hashs";
              aHashs.href="#";
              aHashs.addEventListener("click", function(){
                this.nextElementSibling.hidden = !this.nextElementSibling.hidden;
              });
              hashsDiv.appendChild(aHashs);

              let hashsDiv2 = document.createElement("div");
              hashsDiv2.hidden = true;
              hashsDiv2.innerHTML = `<span>Local</span><br>
                sha1: ${certif["localSha1"]}<br>
                sha256: ${certif["localSha256"]}<br>`;
              for(let r in certif.remote) {
                let sha1Diff = (certif["localSha1"] == certif.remote[r]["sha1"])?'🗸':'🛑';
                let sha256Diff = (certif["localSha256"] == certif.remote[r]["sha256"])?'🗸':'🛑';
                hashsDiv2.innerHTML += `<span>${page.checkcertifServers[r].name}</span><br>
                  ${sha1Diff} sha1: ${certif.remote[r]["sha1"]}<br>
                  ${sha256Diff} sha256: ${certif.remote[r]["sha256"]}<br>`;
              }
              hashsDiv.appendChild(hashsDiv2);
              div.appendChild(hashsDiv);

              //CDN
              if(certif.cdn.length > 0) {
                let cdnDiv = document.createElement("div");
                cdnDiv.innerHTML = "CDN: "+certif.cdn;
                div.appendChild(cdnDiv);

              }
            }
            div.appendChild(document.createElement("hr"));


            tabUrl.appendChild(div);
            cptId++;
          }
        }
      }
    );
  });
}

browser.tabs.onActivated.addListener(updateContent);
browser.tabs.onUpdated.addListener(updateContent);

browser.windows.getCurrent({populate: true}).then((windowInfo) => {
  myWindowId = windowInfo.id;
  updateContent();
});

refreshBtn.addEventListener("click", updateContent);