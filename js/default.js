var checkcertifServersDefault = [
{
  "name": "chkcrt",
  "url": "https://chkcrt-dev.ecirtam.net/",
  "key": `-----BEGIN PGP PUBLIC KEY BLOCK-----

mE8EXWRCwRMFK4EEAAoCAwTF+21xT6d8gP6K+vy8jH1dKxtWdAl3oSzsGD0m+YUf
LzZx45LKHTo5Px595TeyLghPh/cNFASgCakuGdLvcldHtBlQb2NfXyAodGVzdCkg
PHBvY0BwaS5sYW4+iJYEExMIAD4WIQRdvS1FZASCe3nkcmTYSuqJ0YzBYwUCXWRC
wQIbAwUJEswDAAULCQgHAgYVCgkICwIEFgIDAQIeAQIXgAAKCRDYSuqJ0YzBY9Jk
AQDIcwVdPVGyjT330KSNUf8U4UL4p3kssEvZ0yveKEXbTQEAzE7uhtYXU5irtbS/
KlunO4CrASVStG17qM3kLWHubDa4UwRdZELBEgUrgQQACgIDBGVXJ4q0ka+wGqHU
8XGtEey5CqfE8XxLjQJvKrzFP4sgaPhJcOdtxF7KcwhHld0A/+kM5J00+39PDsIN
ld58bC8DAQgHiH4EGBMIACYWIQRdvS1FZASCe3nkcmTYSuqJ0YzBYwUCXWRCwQIb
DAUJEswDAAAKCRDYSuqJ0YzBY59XAP9dCa0Pktc+tJksT7RExIrATnOgUCaRZVu1
naVT/axL2gD/WijWxsq9OX09pYadrRRs4uoy2zHss7MH6qUCTZdv/wQ=
=nq0n
-----END PGP PUBLIC KEY BLOCK-----
`,
	"enable": true,
    "status": 0,
    "api": "?"
}
];

var whitelistHosts = [];//TODO
var whitelistIp = [];

var blacklistHostsDefault = [
	'^.*\\.lan$',
	'^.*\\.local$',
	'^.*\\.localdomain$',
	'^.*localhost$',
	'^.*ip6-localnet$',
	'^.*ip6-mcastprefix$',
	'^.*ip6-allnodes$',
	'^.*ip6-allrouters$'
];
var blacklistIpDefault = [
	//IPv4
	'^127\\..*$',
	'^0\\.0\\.0\\.0.*$',
	'^10\\..*$',
	'^172\\.(1[6-9]|2[0-9]|30|31)\\..*$',
	'^192\\.168\\..*$',
	//IPv6
	'^::1.*$',
	'^::1.*$',
	'^fc[0-9a-fA-F][0-9a-fA-F]:.*$',
	'^fd[0-9a-fA-F][0-9a-fA-F]:.*$',
	'^fe80:.*$',
	'^fe00::.*$',
	'^ff00::.*$',
	'^ff02::.*$',
	'^ff02::.*$'
];

var checkcertifServers = [];
var blacklistHosts = [];
var blacklistIp = [];

//browser.storage.sync.clear();

var gettingItem = browser.storage.sync.get('checkcertifServers');
gettingItem.then((res) => {
	if(res.checkcertifServers) {
		checkcertifServers = res.checkcertifServers;
	}else{
		checkcertifServers = checkcertifServersDefault;

		(async () => {
		var msg = await sendMessage(checkcertifServers[0], {'a':'v'});
			if(msg['status'] && 'api' in msg['message']) {
				checkcertifServers[0]['status'] = 1;
				checkcertifServers[0]['api'] = msg['message']['api'];
			} else {
				checkcertifServers[0]['status'] = 0;
			}
		})()

		browser.storage.sync.set({
			checkcertifServers: checkcertifServers
		});
	}

	if(res.blacklistHosts) {
		blacklistHosts = res.blacklistHosts;
	}else{
		blacklistHosts = blacklistHostsDefault;
		browser.storage.sync.set({
			blacklistHosts: blacklistHostsDefault
		});
	}

	if(res.blacklistIp) {
		blacklistIp = res.blacklistIp;
	}else{
		blacklistIp = blacklistIpDefault;
		browser.storage.sync.set({
			blacklistIp: blacklistIpDefault
		});
	}
});
