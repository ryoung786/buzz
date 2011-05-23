var http = require('http');
var io = require('socket.io');

var server = http.createServer(function(req, res){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h1>Hello world</h1>');
});
server.listen(8080);

var socket = io.listen(server);

var buzz_timeout;

socket.on('connection', function(client){

    var data = { acton: 'joined', id: client.sessionId };
    socket.broadcast(data);

    client.on('message', function(message){
        console.log("got message from " + client.sessionId + ", " +
                    JSON.stringify(message));
        switch (message.action) {
        case 'answer':
            handleAnswer(message, client.sessionId);
            break;
        case 'buzz':
			handleBuzz(client);
            break;
        default:
            break;
        }
        return true;
    });

    client.on('disconnect', function(){
        return true;
    });
});

function validateAnswer(given) {
    return given == 'foo';
}

function handleAnswer(data, client_id) {
    clearTimeout(buzz_timeout);
    var response = { action: 'answer', id: client_id,
                     answer: data.value };
    response.correct = validateAnswer(data.value);
    socket.broadcast(response);
}

function handleBuzz(client) {
	// inform the client that they won the buzz and should now submit an answer
	var response = { action: 'you_buzzed' };
	client.send(response);
	// broadcast to everyone except the one who buzzed in
	response = { action: 'someone_buzzed', id: client.sessionId };
	socket.broadcast(response, client.sessionId);

	// they now have 5 seconds to submit an answer
	startCountdown();
}

function startCountdown() { // make a class for this?
    buzz_timeout = setTimeout(function() {
        socket.broadcast({ action: 'time_up' });
    }, 5000);
}