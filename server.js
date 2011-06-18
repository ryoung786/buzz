var http = require('http');
var io = require('socket.io');
var game_states = require('./game_states');
var mongodb = require('mongodb');
require('./game');


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
var games = {};

socket.on('connection', function(client){

    //TODO move into Game
    // if (clients.length == 1) {
    //     askQuestion();
    // } else {
    //     client.send({action: 'new_question', question: current_question.question});
    // }

    client.on('message', function(message){
        console.log("got message from " + client.sessionId + ", " +
                    JSON.stringify(message));
        switch (message.action) {
          case 'join':
            handleJoin(message, client); break;
          case 'answer':
            handleAnswer(message, client); break;
          case 'buzz':
            handleBuzz(client); break;
          default: break;
        }
        return true;
    });

    client.on('disconnect', function(){
        //TODO move into Game
        // delete(clients[''+client.sessionId]);
        // var data = { action: 'left', id: client.sessionId, all: Object.keys(clients) };
        // socket.broadcast(data);
        return true;
    });
});

function connectdb(callback) {
    var server = new mongodb.Server("127.0.0.1", 27017, {});
    new mongodb.Db('buzz', server, {}).open(function (error, client) {
        if (error) throw error;
        callback(client);
    });
}

function handleJoin(data, client) {
    // data:  { action: 'join', game_id: 1234 }

    // retrieve the game from the game cache
    var game = games[data.game_id];

    // if no game exists, create a new game, add it to the cache
    if (!game) {
        game = new Game();
        games[data.game_id] = game;
    }

    // tell the game instance we have a new player
    var all_players = game.addNewPlayer(client.sessionId);

    // tell all the players who joined
    var data = { acton: 'joined', id: client.sessionId, all: all_players };
    socket.broadcast(data);
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
        if (++answer_tries > 2) {
            answer_tries = 0;
            askQuestion();
        } else {
            game_state = game_states.ASKING_QUESTION;
        }
    }, 5000);
}