$(function() {
    // socket definitions and handlers
    var socket = new io.Socket('localhost', { port: 8080 });
    socket.on('connect', function(){
        console.log('connected');
        socket.send({action: 'join', game_id: 1 });
    });
    socket.on('disconnect', function(){
        console.log('disconnected');
    });

    socket.on('message', function(data) {
		console.log(data);
		switch (data.action) {
		case 'joined':
			handleJoined(data);
			break;
		case 'answer':
			handleAnswer(data);
			break;
		case 'someone_buzzed':
			handleSomeoneBuzzed(data);
			break;
		case 'you_buzzed':
			handleYouBuzzed(data);
			break;
		case 'time_up':
			handleTimeUp();
			break;
        case 'new_question':
            handleNewQuestion(data);
            break;
		default:
			break;
		}
    });

	var handleSomeoneBuzzed = function(data) {
		console.log(data.id + " buzzed in");
		$("#buzz_btn").attr('disabled', true);
        return false;
	};

	var handleYouBuzzed = function(data) {
		console.log('you buzzed');
		$("#buzz_btn").attr('disabled', true).hide();
		$("#answer_form").show();
		$("#answer_txt").focus();
	};

	var handleAnswer = function(data) {
		$("#buzz_btn").removeAttr('disabled').show().focus();
		$("#answer_form").hide();
		console.log(data.answer + " was " +
					(data.correct ? "correct" : "incorrect"));
	};

	var handleTimeUp = function() {
		$("#buzz_btn").removeAttr('disabled').show().focus();
		$("#answer_form").hide();
		console.log("Time's up! Counted as incorrect");
	}

	var handleJoined = function(data) {
		console.log(data.id + " joined the game");
	};

    var handleNewQuestion = function(data) {
		$("#answer_form").hide();
		$("#buzz_btn").removeAttr('disabled').show().focus();
        $('div.question p').replaceWith('<p>' + data.question + '</p>');;
    };


    // form handlers
    $('#buzz_btn').click(function() {
		socket.send({action: 'buzz', game_id: 1});
    });

	$('#answer_btn').click(function() {
		socket.send({action: 'answer', game_id: 1,
					 value: $('#answer_txt').val()
					});
	});

    socket.connect();
});