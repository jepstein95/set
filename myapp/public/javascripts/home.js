var socket = io.connect();

var colors = ["Red", "Green", "Blue"];
var numbers = [1, 2, 3];
var shapes = ["Ovals", "Diamonds", "Squiggles"];
var fills = ["Open", "Shaded", "Filled"];

$(document).ready(function() {
	var appview;
	var username;
	var nickname;
	var room;
	var avail = false;
	
	var timer;
	var canPick = false;
	var picked = [];
	
	$("#main").hide();
	$("#login").show();
	
	// CREATE USER
	$("#createUser").click(function() {
		var username = $("#newUsername").val();
		var password = $("#newPassword").val();
		$("#newUsername").val("");
		$("#newPassword").val("");
		$("#message").text("");
		socket.emit("create-user", {username: username, password: password});
	});
	
	// LOGIN
	$("#login").click(function() {
		var username = $("#username").val();
		var password = $("#password").val();
		$("#username").val("");
		$("#password").val("");
		$("#message").text("");
		socket.emit("login-user", {username: username, password: password});
	});
	
	// LOGOUT
	$("#logout").click(function() {
		$("#main").hide();
		$("#login").show();
		socket.emit("logout-user", {username: username});
		if (room != null)
			socket.emit("leave-room", {room: room, username: username});
		username = null;
		nickname = null;
		room = null;
		avail = false;
	});
	
	// LEAVE ROOM
	$("#leave").click(function() {
		$("#room").css('visibility', 'hidden');
		appview.resetMsgList();
		socket.emit("leave-room", {room: room, username: username});
		room = null;
		avail = true;
	});
	
	// SUBMIT MESSAGE
	$("#submitMsg").click(function() {
		var message = $("#chatMsg").val();
		$("#chatMsg").val("");
		socket.emit("chat-message", {room: room, username: username, nickname: nickname, message: message});
	});
	
	// SET CALL
	$("#set").click(function() {
		socket.emit("set-call", {room: room, username: username});
	});
	
	// ON: LOGIN-RESPONSE
	socket.on("login-response", function(content) {
		if (content.bool) {
			$("#main").show();
			$("#login").hide();
			$("#title").text(content.message);
			$("#room").css('visibility', 'hidden');
			appview = initAppView();
			socket.emit("get-users", {});
			username = content.username;
			nickname = content.nickname;
			avail = true;
		} else {
			$("#message").text(content.message);
		}
	});
	
	// ON: GET-USERS-RESPONSE
	socket.on("get-users-response", function(content) {
		if (appview !== undefined) {
			appview.users.reset();
			for (var i = 0; i < content.users.length; i++) {
				var user = content.users[i];
				if (user != "" && user != username) {
					var nickname = content.nicknames[i];
					var wins = content.wins[i];
					var losses = content.losses[i];
					appview.users.add(new User({username: user, nickname: nickname, wins: wins, losses: losses}));
				}
			}
		}	
	});
	
	// ON: CHAT-MESSAGE-RESPONSE
	socket.on("chat-message-response", function(content) {
		if (appview !== undefined && content.room == room) {
			appview.messages.add(new Message({username: content.username, nickname: content.nickname, message: content.message}));
		}
	});
	
	// ON: CHALLENGE-RESPONSE
	socket.on("challenge-response", function(content) {
		if (content.success && content.challenger == username) {
			if (content.accept) {
				socket.emit("join-room", {room: content.challenger, username: username});
				room = content.challenger;
				$("#room").css('visibility', 'visible');
				appview.messages.reset();
			} else {
				alert("CHALLENGE NOT ACCEPTED");
				avail = true;
			}
		}
	});
	
	// ON: CHALLENGED
	socket.on("challenged", function(content) {
		if (content.other == username) {
			var accept;
			if (avail)
				accept = confirm("Accept challenge from user " + content.challenger + "?");
			else
				accept = false;
			socket.emit("challenged-response", {accept: accept, challenger: content.challenger, other: content.other});
			if (accept) {
				socket.emit("join-room", {room: content.challenger, username: username});
				room = content.challenger;
				$("#room").css('visibility', 'visible');
				appview.messages.reset();
				avail = false;
			}
		}
	});
	
	// ON: START-GAME
	socket.on("start-game", function (content) {
		_.each(content.deck, function(value) {
			var chars = value.split(" ");
			appview.deck.add(new Card({number: chars[0], color: chars[1], shape: chars[2], fill: chars[3]}));
		});
		drawCards(9);
	});
	
	// ON: SET-CALL-RESPONSE
	socket.on("set-call-response", function(content) {
		if (content.username == username) {
			canPick = true;
			$('#setMsg').text("Pick three cards.");
			timer = window.setTimeout(function() {
				canPick = false;
				picked = [];
				socket.emit("set-pick", {bool: false, room: content.room});
			}, 3000);
		} else {
			$('#setMsg').text(content.username + " called a set.");
		}
	});
	
	// ON: SET-PICK-RESPONSE
	socket.on("set-pick-response", function(content) {
		if (content.bool) {
			// update score
			$('#setMsg').text(content.username + " got a set.");
			_.each(content.picked, function(value) {
				var chars = value.split(" ");
				var card = appview.cards.findWhere({number: chars[0], color: chars[1], shape: chars[2], fill: chars[3]});
				appview.cards.remove(card);
			});
			drawCards(3);
		} else if (content.timeout) {
			$('#setMsg').text("Time up!");
		} else {
			$('#setMsg').text("Not a set.");
		}
	});
	
	// APPVIEW
	function initAppView() {
		User = Backbone.Model.extend({
			username: null,
			nickname: null,
			wins: null,
			losses: null
		});
	
		Users = Backbone.Collection.extend({
			initialize: function (models, options) {
				this.bind("add", options.view.addUserLi);
				this.bind("reset", options.view.resetUserList);
			}
		});
		
		Message = Backbone.Model.extend({
			username: null,
			nickname: null,
			message: null
		});
		
		Messages = Backbone.Collection.extend({
			initialize: function (models, options) {
				this.bind("add", options.view.addMsgLi);
				this.bind("reset", options.view.resetMsgList);
			}
		});
		
		Card = Backbone.Model.extend({
			number: null,
			color: null,
			shape: null,
			fill: null
		});
		
		Cards = Backbone.Collection.extend({
			initialize: function(models, options) {
				this.bind("add", options.view.addCardLi);
				this.bind("remove", options.view.removeCardLi);
				this.bind("reset", options.view.resetCards);
			}
		});
		
		Deck = Backbone.Collection.extend({
			initialize: function(models, options) {
				this.bind("add", options.view.addToDeck);
				this.bind("remove", options.view.drawCard);
				this.bind("reset", options.view.emptyDeck);
			}
		});

		AppView = Backbone.View.extend({
			
			el: $('body'),
			
			initialize: function() {
				this.users = new Users(null, {view: this});
				this.messages = new Messages(null, {view: this});
				this.cards = new Cards(null, {view: this});
				this.deck = new Deck(null, {view: this});
			},
			
			addUserLi: function(model) {
				var ul = $('#users');
				var li = $('<li>');
				$(li).text(model.get('username'));
				var info = $('<div>');
				$(info).attr('class', 'info');
				if (room == null) {
					var nickname = $('<p>');
					$(nickname).text("Nickname: " + model.get('nickname'));
					var stats = $('<p>');
					$(stats).text("W/L: " + model.get('wins') + "/" + model.get('losses'));
					var challenge = $('<input>');
					$(challenge).attr('type', 'button');
					$(challenge).attr('value', 'Challenge');
					$(challenge).click(function(event) {
						socket.emit("challenge", {challenger: username, other: model.get('username')});
						avail = false;
					});
					$(info).append(nickname);
					$(info).append(stats);
					$(info).append(challenge);
				} else {
					var score = $('<p>');
					var id = "" + username + "Score";
					$(score).attr('id', id);
					$(score).text("Score: 0");
					$(info).append(score);
				}
				$(info).hide();
				$(li).append(info);
				$(li).hover(function() {
						$(this).find('div').show();
					},
					function() {
						$(this).find('div').hide();
				});
				$(ul).append(li)	
			},
			
			resetUserList: function(model) {
				$('#users').empty();
			},
			
			addMsgLi: function(model) {
				var chat = $('#chat');
				var li = $('<li>');
				var name = $('<b>');	
				if (model.get('nickname') != null)
					$(name).text(model.get('username') + "(" + model.get('nickname') + "):");
				else
					$(name).text(model.get('username') + ":");
				var msg = $('<p>');
				$(msg).text(model.get('message'));
				$(li).append(name);
				$(li).append(msg);
				$(chat).append(li);
			},
			
			resetMsgList: function(model) {
				$('#chat').empty();
			},
			
			addCardLi: function(model) {
				var number = numbers[model.get('number')];
				var color = colors[model.get('color')];
				var shape = shapes[model.get('shape')];
				var fill = fills[model.get('fill')];
				var src = "/images/" + number + " " + color + " " + fill + " " + shape + " (2).jpg";
				var card = $('<li>');
				var id = model.get('number') + " " + model.get('color') + " " + model.get('shape') + " " +  model.get('fill');
				card.attr('id', id);
				var img = $('<img class="cardImg">');
				img.attr('src', src);
				$(card).append(img);
				$(card).click(function(event) {
					if (canPick) {
						picked.push(id);
						if (picked.length == 3) {
							socket.emit("set-pick", {bool: true, room: room, username: username, picked: picked});
							window.clearTimeout(timer);
							canPick = false;
							picked = [];
						}
					}
				});
				var size1 = $('#stack1 li').length;
				var size2 = $('#stack2 li').length;
				var size3 = $('#stack3 li').length;
				if ((size1 < size2) && (size1 < size3))
					$('#stack1').append(card);
				else if (size2 < size3)
					$('#stack2').append(card);
				else
					$('#stack3').append(card);
			},
			
			removeCardLi: function(model) {
				var number = model.get('number');
				var color = model.get('color');
				var shape = model.get('shape');
				var fill = model.get('fill');
				var id = "" + number + " " + color + " " +  shape + " " + fill;
				var toRemove = document.getElementById(id);
				$(toRemove).remove()
			},
			
			resetCards: function(model) {
				$('#stack1').empty();
				$('#stack2').empty();
				$('#stack3').empty();
			}, 
			
			addToDeck: function(model) {
				$('#deckSize').text("Cards left: " + appview.deck.length);
			},
			
			drawCard: function(model) {
				$('#deckSize').text("Cards left: " + appview.deck.length);
			},
			
			emptyDeck: function(model) {
				$('#deckSize').text("Cards left: " + appview.deck.length);
			}
		});
		
		return new AppView;
	}
	
	function drawCards(numCards) {
		for (var i = 0; i < numCards; i++) {
			var card = appview.deck.pop();
			appview.cards.add(card);
		}
	}
});