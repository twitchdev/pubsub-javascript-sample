const clientId = 'ja7y2ey1ddv1ayx5v9urjyv4xiu9el'; // YOUR CLIENT ID HERE
const redirectURI = 'https://oelna.github.io/pubsub-javascript-sample'; // YOUR REDIRECT URL HERE
const scope = 'user_read+channel:read:subscriptions+channel:read:redemptions+bits:read';
let ws;
const wsOutput = document.querySelector('.ws-output');

function parseFragment (hash) {
	const hashMatch = function (expr) {
		const match = hash.match(expr);
		return match ? match[1] : null;
	};
	const state = hashMatch(/state=(\w+)/);
	if (sessionStorage.twitchOAuthState == state)
		sessionStorage.twitchOAuthToken = hashMatch(/access_token=(\w+)/);
	return;
}

function authUrl () {
	sessionStorage.twitchOAuthState = nonce(15);
	const url = 'https://id.twitch.tv/oauth2/authorize' +
		'?response_type=token' +
		'&client_id=' + clientId + 
		'&redirect_uri=' + redirectURI +
		'&state=' + sessionStorage.twitchOAuthState +
		'&scope=' + scope;
	return url;
}

// Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
function nonce (length) {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function heartbeat () {
	message = {
		'type': 'PING'
	}
	wsOutput.append('SENT: ' + JSON.stringify(message) + '\n');
	ws.send(JSON.stringify(message));
}

function listen (topic) {
	message = {
		'type': 'LISTEN',
		'nonce': nonce(15),
		'data': {
			'topics': [topic],
			'auth_token': sessionStorage.twitchOAuthToken
		}
	}
	wsOutput.append('SENT: ' + JSON.stringify(message) + '\n');
	ws.send(JSON.stringify(message));
}

function connect () {
	const heartbeatInterval = 1000 * 60; //ms between PING's
	const reconnectInterval = 1000 * 3; //ms to wait before reconnect
	let heartbeatHandle;

	ws = new WebSocket('wss://pubsub-edge.twitch.tv');

	ws.onopen = function (event) {
		wsOutput.append('INFO: Socket Opened\n');
		heartbeat();
		heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
	}

	ws.onerror = function (error) {
		wsOutput.append('ERR:  ' + JSON.stringify(error) + '\n');
	}

	ws.onmessage = function (event) {
		message = JSON.parse(event.data);
		wsOutput.append('RECV: ' + JSON.stringify(message) + '\n');
		if (message.type == 'RECONNECT') {
			wsOutput.append('INFO: Reconnecting …\n');
			setTimeout(connect, reconnectInterval);
		}
	}

	ws.onclose = function () {
		wsOutput.append('INFO: Socket Closed\n');
		clearInterval(heartbeatHandle);
		wsOutput.append('INFO: Reconnecting …\n');
		setTimeout(connect, reconnectInterval);
	}
}

if (document.location.hash.match(/access_token=(\w+)/)) {
	parseFragment(document.location.hash);
}

if (sessionStorage.twitchOAuthToken) {
	connect();
	document.querySelector('.socket').classList.remove('hidden');
	
	fetch('https://api.twitch.tv/helix/users', {
		method: 'GET',
		headers: new Headers({
			"Accept": "application/json",
			"Client-ID": clientId,
			"Authorization": "Bearer " + sessionStorage.twitchOAuthToken
		})
	})
	.then(function (response) { return response.json(); })
	.then(function (user) {
		if (user && user.data && user.data.length > 0) {
			document.querySelectorAll('.user-id').forEach(function (ele, i) {
				ele.textContent = user.data[0].id;
			});
		}
	});
} else {
	const url = authUrl()
	document.querySelector('#auth-link').setAttribute('href', url);
	document.querySelector('.auth').classList.remove('hidden');
}

document.querySelector('#topic-form').addEventListener('submit', function (e) {
	e.preventDefault();
	listen(document.querySelector('#topic-text').value);
});

document.querySelectorAll('.endpoints li').forEach(function (ele, i) {
	ele.addEventListener('click', function (e) {
		e.preventDefault();
		document.querySelector('#topic-text').value = this.textContent;
	});
});
