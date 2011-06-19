events = require('events');
gs = require('./game_states');
mongodb = require('mongodb');

Game = function(id){
    this.id = id;
	this.state = gs.INIT;
    this.players = {}; // session_id -> player object
    this.question;
    this.current_buzz;
    this.incorrect_answers = 0;
    this.db = new mongodb.Server("127.0.0.1", 27017, {});
};

Game.prototype = new events.EventEmitter();

methods = {
    addNewPlayer : function(session_id) {
        this.players[session_id] = 1;
        if (Object.keys(this.players).length == 1) {
            this.askNewQuestion();
        }
        return this.players;
    },

    removePlayer : function(session_id) {
        delete this.players[session_id];
        this.emit('playerRemoved', session_id, Object.keys(this.players));
    },

    askNewQuestion : function() {
        var self = this;
        this.question = null;
        this.incorrect_answers = 0;
        new mongodb.Db('buzz', this.db, {}).open(function (err, client) {
            if (err) throw err;
            var coll = new mongodb.Collection(client, 'questions');
            coll.find().toArray(function (err, docs) {
                var i = Math.floor(Math.random()*docs.length);
                self.changeQuestion(docs[i]);
            });
        });
    },

    changeQuestion : function(question) {
        this.question = question;
        this.state = gs.ASKING_QUESTION;
        console.log('emitted new question ' + question.question);
        this.emit('newQuestion', question.question);
    },

    playerAnswered : function(data, player_id) {
        // confirm we are waiting for an answer
        // confirm the answer is coming from the same person that buzzed
        // check if answer is correct
        //  y: update score, correct answer event
        //  n: decrease wrong counter, wrong answer event
        this.verifyState(gs.WAITING_FOR_ANSWER);
        if (this.current_buzz != player_id) {
		    throw new WrongPlayerAnsweredBuzzException();
	    }
        this.current_buzz = null;
        clearTimeout(this.buzz_timeout);
        console.log(data);
        var correct = this.isCorrect(data.value, this.question.answer);
        if (correct) {
            this.emit('correctAnswer', data.value);
            this.askNewQuestion();
        } else {
            this.emit('incorrectAnswer', data.value);
            this.incorrectAnswer(data.value, false);
        }
    },

    incorrectAnswer : function(wrong_answer, time_up) {
        this.incorrect_answers++;
        if (this.incorrect_answers > 2) {
            var answer = this.question.answer;
            if (this.question.answer instanceof Array) {
                answer = answer[0];
            }
            this.emit('revealAnswer', answer);
            this.askNewQuestion();
        } else {
            this.state = gs.ASKING_QUESTION;
        }
    },

    startBuzzCountdown : function() {
        var self = this;
        clearTimeout(this.buzz_timeout);
        this.buzz_timeout = setTimeout(function() {
            self.emit('timesUpOnBuzz', self.current_buzz);
            self.incorrectAnswer('', true);
        }, 5000);
    },

    playerBuzzed : function(data, player_id) {
        this.verifyState(gs.ASKING_QUESTION);
        this.state = gs.WAITING_FOR_ANSWER;
        this.current_buzz = player_id;
        this.startBuzzCountdown();
    },

    isCorrect : function(given_answer, answer) {
        given_answer = given_answer.toLowerCase();
        if (answer instanceof Array) {
            for (i=0; i<answer.length; i++) { answer[i] = answer[i].toLowerCase(); }
            if (answer.indexOf(given_answer) >= 0) { return true; }
            var x = parseInt(given_answer);
            return !isNaN(x) && answer.indexOf(x) >= 0;
        }
        return given_answer == answer.toLowerCase();
    },

    verifyState : function(state) {
	    if (state != this.state) {
		    throw new WrongStateException();
	    }
    }
};

function merge_options(obj1,obj2){
    var obj3 = {};
    for (attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

Game.prototype = merge_options(methods, Game.prototype);
exports.Game = Game;
