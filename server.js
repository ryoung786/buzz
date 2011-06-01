var http = require('http');
var io = require('socket.io');
var game_states = require('./game_states');

var server = http.createServer(function(req, res){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h1>Hello world</h1>');
});
server.listen(8080);

var socket = io.listen(server);


var game_state = game_states.INIT;

var current_question = null;

var current_buzzer_client_id = null;

var answer_tries = 0;

var buzz_timeout;

var questions = [ {question: '2+2=?', answer: '4'},
				  {question: 'first US president?', answer: 'Washington'},
				  {question: '3*3=?', answer: '9'} ];

var clients = {};

socket.on('connection', function(client){
	clients[''+client.sessionId] = 1;

    var data = { acton: 'joined', id: client.sessionId, all: Object.keys(clients) };
    socket.broadcast(data);

	if (Object.keys(clients).length == 1) {
		askQuestion();
	}

    client.on('message', function(message){
        console.log("got message from " + client.sessionId + ", " +
                    JSON.stringify(message));
        switch (message.action) {
        case 'answer':
            handleAnswer(message, client);
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
		delete(clients[''+client.sessionId]);
		var data = { action: 'left', id: client.sessionId, all: Object.keys(clients) };
		socket.broadcast(data);
        return true;
    });
});

function validateAnswer(given) {
    return given == current_question.answer;
}

function handleAnswer(data, client) {
    if (game_state != game_states.WAITING_FOR_ANSWER) {
        client.send({action: 'error',
                     error: "you can't answer before buzzing in"});
		console.log("you can't answer before buzzing in; in state " + game_state);
        return;
    } else if (client.sessionId != current_buzzer_client_id) {
        client.send({action: 'error',
                     error: "you can't answer when you haven't buzzed in"});
		console.log("you can't answer when you haven't buzzed in; state " + game_state);
        return;
    }
    clearTimeout(buzz_timeout);
    var response = { action: 'answer', id: client.sessionId,
                     answer: data.value };
    response.correct = validateAnswer(data.value);
    socket.broadcast(response);

    if (response.correct || ++answer_tries > 2) {
		console.log(data.value + " was correct. asking a new question");
        answer_tries = 0;
        askQuestion();
    } else {
		console.log(data.value + " was incorrect. Looking for " + current_question.answer);
        game_state = game_states.ASKING_QUESTION;
    }
}

function handleBuzz(client) {
    if (game_state != game_states.ASKING_QUESTION) {
        client.send({action: 'error',
                     error: "you can't buzz when a question isn't being asked"});
		console.log("you can't buzz when in state " + game_state);
        return;
    }
    current_buzzer_client_id = client.sessionId;
	// inform the client that they won the buzz and should now submit an answer
	var response = { action: 'you_buzzed' };
	client.send(response);
	// broadcast to everyone except the one who buzzed in
	response = { action: 'someone_buzzed', id: client.sessionId };
	socket.broadcast(response, client.sessionId);

	game_state = game_states.WAITING_FOR_ANSWER;

	// they now have 5 seconds to submit an answer
	startCountdown();
}

function startCountdown() { // make a class for this?
    buzz_timeout = setTimeout(function() {
        socket.broadcast({ action: 'time_up' });
		askQuestion();
    }, 5000);
}

function askQuestion() {
	game_state = game_states.ASKING_QUESTION;
    current_question = questions[Math.floor(Math.random()*questions.length)];
    socket.broadcast({action: 'new_question', question: current_question.question});
}