gs = require('./game_states');

Game = function(){
	this.state = gs.INIT;
    this.players = {}; // session_id -> player object
    this.question;
    this.db = new mongodb.Server("127.0.0.1", 27017, {});
};

Game.prototype = {

    addNewPlayer : function(session_id) {
        this.players[session_id] = 1;
        if (players.length == 1) {
            // ask a question?  sure why not
            this.askQuestion();
        }
        return this.players;
    },

    askQuestion : function() {
        new mongodb.Db('buzz', db, {}).open(function (err, client) {
            if (err) throw err;
            var coll = new mongodb.Collection(client, 'questions');
            coll.find().toArray(function (err, docs) {
                var i = Math.floor(Math.random()*docs.length);
                // raise new question event for docs[i]
            });
        });
    },

	playerAnswered : function(data, player_id) {
		if (this.state != WAITING_FOR_ANSWER) {
			throw new WrongStateException();
		} else if (this.current_buzz.player_id != player_id) {
			throw new WrongPlayerAnsweredBuzzException();
		}
	},

    // return true if given_answer is in answer (if array)
    //             or if given_answer == answer
    // case insensitive
    isCorrect: function(given_answer, answer) {
        given_answer = given_answer.toLowerCase();
        if (answer instanceof Array) {
            if (ans.indexOf(given_answer) >= 0) { return true; }
            var x = parseInt(given_answer);
            return !isNaN(x) && ans.indexOf(x) >= 0;
        }
        return given_answer == current_question.answer;
    }
}

exports.Game = Game;