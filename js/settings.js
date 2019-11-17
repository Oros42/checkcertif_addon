function addServerTr(server) {
  let tr = document.createElement('tr');
  let isChecked = "";
  if(server.enable) {
    isChecked = "checked";
  }
  let serverStatus = "🗶";
  if(server.status){
    serverStatus = "🗸";
  }
  tr.innerHTML = `<td><input type="checkbox" ${isChecked}></td>
    <td>${serverStatus}</td>
    <td>${server.api}</td>
    <td>${server.name}</td>
    <td>${server.url}</td>
    <td><a href="#">view</a></td>
    <td><a href="#">edit</a></td>
    <td><a href="#">delete</a></td>`;
  tr.children[0].children[0].addEventListener("change", function(e){
    changeServerEnable(server.id, this.checked);
  });
  tr.children[7].children[0].addEventListener("click", function(){
    deleteSrv(server.id);
    return false;
  });
  serverList.appendChild(tr);
}

function deleteSrv(id) {
  delete checkcertifServers[id];
  save(checkcertifServers);
  listServer(checkcertifServers);
}


function listServer(servers){
  serverList.innerHTML = "";
  for (var serverId in servers) {
    if(servers[serverId] != null) {
      servers[serverId].id = serverId;
      addServerTr(servers[serverId]);
    }
  }
}

async function saveOptions(e) {
  errorAdd.hidden=true;
  e.preventDefault();
  let newServer = {
    "name": document.querySelector("#serverName").value,
    "url": document.querySelector("#serverUrl").value,
    "key": document.querySelector("#serverKey").value,
    "enable": true,
    "status": 0,
    "api": ""
  };
  var msg = await sendMessage(newServer, {'a':'v'});
  if(msg['status'] && 'api' in msg['message']) {
    newServer['status'] = 1;
    newServer['api'] = msg['message']['api'];
  } else {
    //TODO show alert
    errorAdd.hidden=false;
    return;
  }

  // check if exist
  for (var serverId in checkcertifServers) {
    if(checkcertifServers[serverId] == newServer.url){
      //server already exist
      return;
    }
  }
  checkcertifServers.push(newServer);
  save(checkcertifServers);
  listServer(checkcertifServers);
}

function restoreOptions() {
  var gettingItem = browser.storage.sync.get('checkcertifServers');
  gettingItem.then((res) => {
    listServer(res.checkcertifServers);
  });
}

function changeServerEnable(id, isEnabled) {
  checkcertifServers[id].enable = isEnabled;
  save(checkcertifServers);
}

function save(newCheckcertifServers){
  browser.storage.sync.set({
    checkcertifServers: newCheckcertifServers
  });
}


document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.getElementById("reset").addEventListener("click", function(){
  browser.storage.sync.clear();
  save(checkcertifServersDefault);
  restoreOptions();
  return false;
});

