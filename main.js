var clientId = '<YOUR CLIENT ID HERE>'; 
var redirectURI = '<YOUR REDIRECT URL HERE>';
var scope = 'user_read+chat_login';
var ws;

function parseFragment(hash) {
    var hashMatch = function(expr) {
      var match = hash.match(expr);
      return match ? match[1] : null;
    };
    var state = hashMatch(/state=(\w+)/);
    if (sessionStorage.twitchOAuthState == state)
        sessionStorage.twitchOAuthToken = hashMatch(/access_token=(\w+)/);
    return
};

function authUrl() {
    sessionStorage.twitchOAuthState = nonce(15);
    var url = 'https://api.twitch.tv/kraken/oauth2/authorize' +
        '?response_type=token' +
        '&client_id=' + clientId + 
        '&redirect_uri=' + redirectURI +
        '&state=' + sessionStorage.twitchOAuthState +
        '&scope=' + scope;
    return url
}

// Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
function nonce(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function heartbeat() {
    message = {
        type: 'PING'
    };
    $('.ws-output').append('SENT: ' + JSON.stringify(message) + '\n');
    ws.send(JSON.stringify(message));
}

function listen(topic) {
    message = {
        type: 'LISTEN',
        nonce: nonce(15),
        data: {
            topics: [topic],
            auth_token: sessionStorage.twitchOAuthToken
        }
    };
    $('.ws-output').append('SENT: ' + JSON.stringify(message) + '\n');
    ws.send(JSON.stringify(message));
}

function connect() {
    var heartbeatInterval = 1000 * 60; //ms between PING's
    var reconnectInterval = 1000 * 3; //ms to wait before reconnect
    var heartbeatHandle;

    ws = new WebSocket('wss://pubsub-edge.twitch.tv');

    ws.onopen = function(event) {
        $('.ws-output').append('INFO: Socket Opened\n');
        heartbeat();
        heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
    };

    ws.onerror = function(error) {
        $('.ws-output').append('ERR:  ' + JSON.stringify(error) + '\n');
    };

    ws.onmessage = function(event) {
        message = JSON.parse(event.data);
        $('.ws-output').append('RECV: ' + JSON.stringify(message) + '\n');
        if (message.type == 'RECONNECT') {
            $('.ws-output').append('INFO: Reconnecting...\n');
            setTimeout(connect, reconnectInterval);
        }
    };

    ws.onclose = function() {
        $('.ws-output').append('INFO: Socket Closed\n');
        clearInterval(heartbeatHandle);
        $('.ws-output').append('INFO: Reconnecting...\n');
        setTimeout(connect, reconnectInterval);
    };

}

$(function() {
    if (document.location.hash.match(/access_token=(\w+)/))
        parseFragment(document.location.hash);
    if (sessionStorage.twitchOAuthToken) {
        connect();
        $('.socket').show()
        $.ajax({
            url: "https://api.twitch.tv/kraken/user",
            method: "GET",
            headers: {
                "Client-ID": clientId,
                "Authorization": "OAuth " + sessionStorage.twitchOAuthToken
            }})
            .done(function(user) {
                $('#topic-label').text("Enter a topic to listen to. For example, to listen to whispers enter topic 'whispers."+user._id+"'");
            });
    } else {
        var url = authUrl()
        $('#auth-link').attr("href", url);
        $('.auth').show()
    }
});

$('#topic-form').submit(function() {
    listen($('#topic-text').val());
    event.preventDefault();
});


