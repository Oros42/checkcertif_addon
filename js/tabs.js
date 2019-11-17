let panel = document.getElementById('panel');
const backgroundPage = browser.extension.getBackgroundPage();

function getCurrentWindowTabs() {
  return browser.tabs.query({currentWindow: true});
}

getCurrentWindowTabs().then((tabs) => {
  for (var tab of tabs) {
    if (tab.active) {
      if(tab.id in backgroundPage.tabs) {
        tabStatus.innerHTML = backgroundPage.tabStatus[backgroundPage.tabs[tab.id].status].msg;
        tabUrl.innerHTML = ""; //TODO write better code -_-
        for(var urlDomain in backgroundPage.tabs[tab.id].urls) {
          let statusId = backgroundPage.tabs[tab.id].urls[urlDomain].status;
          if(statusId in backgroundPage.tabStatus) {
            tabUrl.innerHTML += backgroundPage.tabStatus[statusId].icon;
          } else {
            tabUrl.innerHTML += "?";
          }
          tabUrl.innerHTML += " "+urlDomain;
          if(urlDomain in backgroundPage.rootCertStats) {
            tabUrl.innerHTML += " ("+backgroundPage.rootCertStats[urlDomain].ip.join(', ')+")";
          }
          tabUrl.innerHTML += "<br>";
        }
      }
    }
  }
});