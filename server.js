var http = require('http');
var io = require('socket.io');
require('./game');


var server = http.createServer(function(req, res){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h1>Hello world</h1>');
});
server.listen(8080);
var socket = io.listen(server);

var games = {};

socket.on('connection', function(client){

    client.on('message', function(message){
        console.log("got message from " + client.sessionId + ", " +
                    JSON.stringify(message));
        switch (message.action) {
          case 'join':
            handleJoin(message, client); break;
          case 'answer':
            handleAnswer(message, client); break;
          case 'buzz':
            handleBuzz(message, client); break;
          default: break;
        }
        return true;
    });

    // todo disconnect
});

function registerGameCallbacks(game) {
    game.on('playerRemoved', function(session_id, players) {
        var data = { action: 'player_left', id: session_id, all: players };
        socket.broadcast(data);
    });

    game.on('newQuestion', function(question) {
        console.log('broadcasting new question ' + question);
        var data = { action: 'new_question', question: question };
        socket.broadcast(data);
    });

    game.on('correctAnswer', function(answer) {
        var data = { action: 'answer', answer: answer, correct: true };
        socket.broadcast(data);
    });

    game.on('incorrectAnswer', function(answer) {
        var data = { action: 'answer', answer: answer, correct: false };
        socket.broadcast(data);
    });

    game.on('timesUpOnBuzz', function(answer) {
        var data = { action: 'answer', answer: '', correct: false };
        socket.broadcast(data);
    });    
}

function handleJoin(data, client) {
    // retrieve the game from the game cache
    var game = games[data.game_id];

    // if no game exists, create a new game, add it to the cache
    if (!game) {
        game = new Game(data.game_id);
        games[data.game_id] = game;
        console.log('created a new game with id ' + game.id);
        registerGameCallbacks(game);
    }

    // tell the game instance we have a new player
    var all_players = game.addNewPlayer(client.sessionId);

    // tell all the players who joined
    var data = { acton: 'joined', id: client.sessionId,
                 all: Object.keys(all_players) };
    socket.broadcast(data);
}

function handleAnswer(data, client) {
    var game = games[data.game_id];
    game.playerAnswered(data, client.sessionId);
}

function handleBuzz(data, client) {
    var game = games[data.game_id];
    game.playerBuzzed(data, client.sessionId);
    client.send({action: 'you_buzzed'});
}