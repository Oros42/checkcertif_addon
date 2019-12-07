const tabStatusWait = 0;
const tabStatusOk = 1;
const tabStatusQuestion = 2;
const tabStatusBlacklisted = 3;
const tabStatusDanger = 4;
var tabStatus = {
  0:{ // wait
    'img':'status-wait-48.png',
    'msg':'wait',
    'icon':'…'
  },
  1:{ // https, no error, good hash
    'img':'status-ok-48.png',
    'msg':'OK',
    'icon':'<b style="color:green;background:white;">🗸</b>'//🗸 
  },
  2:{ // https, no response
    'img':'status-question-48.png',
    'msg':'⁉',
    'icon':'<b style="color:blue;background:white;">🛈</b>'//?
  },
  3:{ // blacklisted
    'img':'status-blacklisted-48.png',
    'msg':'Local / blacklisted',
    'icon':'<b style="color:red;background:white;">🛇</b>'
  },
  4:{ // no https or error or bad hash
    'img':'status-danger-48.png',
    'msg':'Danger !!!',
    'icon':'🛑'//🗶
  }
};

var rootCertStats = {};
/*
{
  "<URL_DOMAIN>": {
    "status": "secure" | "insecure",
    "create": <DATE>,
    "localSha1": "<SHA1>" | "",
    "localSha256": "<SHA256>" | "",
    "securityInfo": <SecurityInfo> | null,
    "remote": {
      "<SERVER_CHECKCERTIF>": {
        "sha1": "<SHA1>" | "",
        "sha256": "<SHA256>" | ""
      },
      ...
    },
    "cdn": "" | "<CDN>"  //example : "CloudFlare",
    "ip":["<IP>"]
  },
  ...
}
*/

var tabs = {};
/*
  "<ID>": {
    "status": <tabStatus>,
    "urls": {
      "<URL_DOMAIN>": {
        "status": <status>,
        "urls" : [
          "<URL>",
          ...
        ]
      },
      ...
    },
    ...
  }
*/


function removePGPComments(msg){
  return msg.split("\r\n\r\n")[1].split('\r\n-----')[0];
}

function arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

function base64ToArrayBuffer(base64, base64_2="") {
    var binary_string =  window.atob(base64);
    if(base64_2 != "") {
      binary_string +=  window.atob(base64_2);
    }
    var len = binary_string.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

async function sendMessage(server, message){
  /*
    {
      'status':<true|false>,
      'message':<message>,
      'error':<error>
    }
  */
  var key = await window.crypto.subtle.generateKey(
      {name: "AES-GCM",length: 256},
      true,
      ["encrypt", "decrypt"]
    ).then((key) => { return key });

  let exported = await window.crypto.subtle.exportKey(
    "raw",
    key
  );
  let key64 = arrayBufferToBase64(exported);

  var iv = window.crypto.getRandomValues(new Uint8Array(12));
  let iv64 = arrayBufferToBase64(iv);

  message['pwd'] = key64;
  message['i'] = iv64;
  message['v'] = apiVersion;


  const options = {
        message: window.openpgp.message.fromText(JSON.stringify(message)),
        publicKeys: (await window.openpgp.key.readArmored(server.key)).keys // for encryption
  };

  var returnData = {
    'status':false,
    'message':'',
    'error':''
  };

  try{
    returnData = await window.openpgp.encrypt(options).then(ciphertext => {
        //ciphertext.data; // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
        return removePGPComments(ciphertext.data);
    }).then((encrypted) => {
      let formData = new FormData();
      formData.append('m', encrypted);

      const request = new Request(server.url, {
        method: "POST",
        body: formData
      });

      return fetch(request).then((response) => {
        if (response.status === 200) {
          return response.text();
        }else{
          //FIXME bof bof
          throw new Error('Something went wrong on api server!');
        }
      }).then(aesResponse => {
        let aesResponseSplit = aesResponse.split(';');
        let cyphertext = null;
        if (aesResponseSplit.length > 1) {
          cyphertext = base64ToArrayBuffer(aesResponseSplit[0], aesResponseSplit[1]);
        } else {
          cyphertext = base64ToArrayBuffer(aesResponseSplit[1]);
        }

        return crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, cyphertext)
        .then(cleartext => {
          try{
            var returnData = {
              'status':true,
              'message':JSON.parse(new TextDecoder().decode(cleartext)),
              'error':''
            };
          }catch(e){
            returnData = {
              'status':false,
              'message':'',
              'error':e
            };
          }
          return returnData;
        });
      });
    });
  }catch(e){
    returnData = {
      'status':false,
      'message':'',
      'error':e
    };
  }
  return returnData;
}