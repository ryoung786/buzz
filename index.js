$(function() {
    // socket definitions and handlers
    var socket = new io.Socket('localhost', { port: 8080 });
    socket.on('connect', function(){
        console.log('connected');
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


    // form handlers
    $('#buzz_btn').click(function() {
		socket.send({action: 'buzz'});
    });

	$('#answer_btn').click(function() {
		socket.send({action: 'answer',
					 value: $('#answer_txt').val()
					});
	});

    socket.connect();
});