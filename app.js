var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var cookie = require('cookie');
var connect = require('connect');
var Session = require('connect').middleware.session.Session;
var passwordHash = require('password-hash');
var sanitizer = require('sanitizer');
var _ = require('underscore');

var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var routes = require('./routes');
var users = require('./routes/user');
var database = require('./database');

var SITE_SECRET = "This one is the secret";

var app = express();

var sessionStore = new connect.session.MemoryStore();

//app.use(express.bodyParser.json());
//app.use(express.bodyParser.urlencoded());
app.use(express.cookieParser(SITE_SECRET));
app.use(express.session({key: 'express.sid', store: sessionStore}));
app.use(app.router);

// view engine setup
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/home', routes.home);

var server = http.createServer(app);
// socket logic
//require('./socket')(server, sessionStore);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = socketio.listen(server);
	
var users = [];
var rooms = {};
var canCall = {};

// DEVELOPMENT
var numUsers = 0;
var usernames = ["josh", "Babou", "Squid", "Adam"];
	
// ON: CONNECTION
io.sockets.on("connection", function(socket) {
	
	// DEVELOPMENT
	users.push(usernames[numUsers]);
	socket.emit("login-response", {message: "Welcome " + usernames[numUsers] + "!", username: usernames[numUsers], bool: true});
	broadcastUserInfo();
	numUsers++;
		
	// ON: CREATE-USER
	socket.on("create-user", function(content) {
		if (content.password == "" || content.username == "") {
			socket.emit("login-response", {message: "Enter username and password.", bool: false});
		} else {
			var hashedPassword = passwordHash.generate(content.password);
			database.query('SELECT * FROM users where username=?;', [content.username], function(err, rows, fields) {
				if(rows[0]==null){
					database.query('INSERT INTO users (username, password) values (?, ?);', [content.username, hashedPassword], function(err, result) {
						socket.username = content.username;
						socket.userId = result.insertId;
						users.push(content.username);
						broadcastUserInfo();
						socket.emit("login-response", {message: "Welcome " + sanitizer.escape(content.username) + "!", username: sanitizer.escape(content.username), bool: true});
					});
				} else {
					socket.emit("login-response", {message: "Username already taken", bool: false});
				}
			});
		}
	});
		
	//ON: LOGIN-USER
	socket.on("login-user", function(content) {
		if (content.password == "" || content.username == "") {
			socket.emit("login-response", {message: "Enter username and password.", bool: false});
		} else if (_.contains(users, content.username)) {
			socket.emit("login-response", {message: "User already logged in.", bool: false});
		} else {
			database.query('SELECT * FROM users where username=?;', [content.username], function(err, rows, fields) {
				if (rows[0] != null) {
					hashedPassword = rows[0].password;
					var success = passwordHash.verify(content.password, hashedPassword);
					if(success) {
						socket.username = content.username;
						socket.userId = rows[0].id;
						users.push(content.username);
						broadcastUserInfo();
						var nickname = rows[0].nickname;
						socket.emit("login-response", {message: "Welcome " + sanitizer.escape(content.username) + "!", username: sanitizer.escape(content.username), nickname: nickname, bool: true});
					} else {
						socket.emit("login-response", {message: "Incorrect username or password.", bool: false});	
					}
				} else {
					socket.emit("login-response", {message: "Incorrect username or password.", bool: false});
				}
			});
		}
	});
	
	// ON: GET-USERS
	socket.on("get-users", function(content) {
		emitUserInfo();
	});
	
	// ON: CHAT-MESSAGE
	socket.on("chat-message", function(content) {
		if (content.room == null) {
			io.sockets.emit("chat-message-response", {room: content.room, username: content.username, nickname: content.nickname, message: sanitizer.escape(content.message)});
		} else {
			io.sockets.in(content.room).emit("chat-message-response", {room: content.room, username: content.username, nickname: content.nickname, message: sanitizer.escape(content.message)});
		}
	});
	
	// ON: CHALLENGE
	socket.on("challenge", function(content) {
		if (_.contains(users, content.other)) {
			socket.broadcast.emit("challenged", {challenger: content.challenger, other: content.other});
		} else {
			socket.emit("challenge-response", {success: false});
		}
	});
	
	// ON: CHALLENGED-RESPONSE
	socket.on("challenged-response", function(content) {
		socket.broadcast.emit("challenge-response", {success: true, accept: content.accept, challenger: content.challenger, other: content.other});
	});

	// ON: JOIN-ROOM
	socket.on("join-room", function(content) {
		socket.join(content.room);
		rooms[content.username] = content.room;
		canCall[content.room] = true;
		broadcastUserInfo();
		emitUserInfoRoom(content.room);
		broadcastUserInfoRoom(content.room);
		var inRoom = 0;
		_.each(rooms, function(value, key) {
			if (value == content.room)
				inRoom++;
		});
		if (inRoom > 1) {
			startGame(content.room);
		}
		
	});
	
	// ON: SET-CALL
	socket.on("set-call", function(content) {
		canCall[content.room] = true;
		if (canCall[content.room]) {
			io.sockets.in(content.room).emit("set-call-response", {username: content.username});
			canCall[content.room] = false;
		}
	});
	
	// ON: SET-PICK
	socket.on("set-pick", function(content) {
		console.log(canCall[content.room]);
		if (content.bool) {
			if (checkSet(content.picked)) {
				io.sockets.in(content.room).emit("set-pick-response", {bool: true, username: content.username, picked: content.picked});
			} else {
				io.sockets.in(content.room).emit("set-pick-response", {bool: false, timeout: false});
			}
		} else {
			io.sockets.in(content.room).emit("set-pick-response", {bool: false, timeout: true});
		}
	});
	
	// ON: LEAVE-ROOM
	socket.on("leave-room", function(content) {
		console.log("LEAVE ROOM");
		socket.leave(content.room);
		rooms[content.username] = null;
		broadcastUserInfo();
		emitUserInfo();
		broadcastUserInfoRoom(content.room);
	});
	
	// ON: LOGOUT-USER
	socket.on("logout-user", function(content) {
		var index = users.indexOf(content.username); // indexOf --> NO IE
		users.splice(index, 1);
		broadcastUserInfo();
	});
	
	// ON: DISCONNECT
	socket.on("disconnect", function() {
		console.log("A socket disconnected.");
	});
	
	// BROADCAST USER INFO
	function broadcastUserInfo() {
		database.query('SELECT * FROM users', function(err, rows, fields) {
			if (rows[0] != null) {
				var inRoom = [];
				_.each(rooms, function(value, key) {
					if (value != null)
						inRoom.push(key);
				});
				var usernames = [];
				var nicknames = [];
				var wins = [];
				var losses = [];
				for (var i = 0; i < rows.length; i++) {
					if (_.contains(users, rows[i].username) && !_.contains(inRoom, rows[i].username)) {
						usernames.push(rows[i].username);
						nicknames.push(rows[i].nickname);
						wins.push(rows[i].wins);
						losses.push(rows[i].losses);
					}	
				}
				socket.broadcast.emit("get-users-response", {global: true, users: usernames, nicknames: nicknames, wins: wins, losses: losses});
			}
		});
	}
	
	// EMIT USER INFO
	function emitUserInfo() {
		database.query('SELECT * FROM users', function(err, rows, fields) {
			if (rows[0] != null) {
				var inRoom = [];
				_.each(rooms, function(value, key) {
					if (value != null)
						inRoom.push(key);
				});
				var usernames = [];
				var nicknames = [];
				var wins = [];
				var losses = [];
				for (var i = 0; i < rows.length; i++) {
					if (_.contains(users, rows[i].username) && !_.contains(inRoom, rows[i].username)) {
						usernames.push(rows[i].username);
						nicknames.push(rows[i].nickname);
						wins.push(rows[i].wins);
						losses.push(rows[i].losses);
					}	
				}
				socket.emit("get-users-response", {global: true, users: usernames, nicknames: nicknames, wins: wins, losses: losses});
			}
		});
	}
	
	// BROADCAST USER INFO TO A ROOM
	function broadcastUserInfoRoom(room) {
		database.query('SELECT * FROM users', function(err, rows, fields) {
			if (rows[0] != null) {
				var inRoom = [];
				_.each(rooms, function(value, key) {
					if (value == room)
						inRoom.push(key);
				});
				var usernames = [];
				var nicknames = [];
				var wins = [];
				var losses = [];
				for (var i = 0; i < rows.length; i++) {
					if (_.contains(inRoom, rows[i].username)) {
						usernames.push(rows[i].username);
						nicknames.push(rows[i].nickname);
						wins.push(rows[i].wins);
						losses.push(rows[i].losses);
					}	
				}
				socket.broadcast.to(room).emit("get-users-response", {global: false, users: usernames, nicknames: nicknames, wins: wins, losses: losses});
			}
		});
	}
	
	// EMIT USER INFO TO A ROOM
	function emitUserInfoRoom(room) {
		database.query('SELECT * FROM users', function(err, rows, fields) {
			if (rows[0] != null) {
				var inRoom = [];
				_.each(rooms, function(value, key) {
					if (value == room)
						inRoom.push(key);
				});
				var usernames = [];
				var nicknames = [];
				var wins = [];
				var losses = [];
				for (var i = 0; i < rows.length; i++) {
					if (_.contains(inRoom, rows[i].username)) {
						usernames.push(rows[i].username);
						nicknames.push(rows[i].nickname);
						wins.push(rows[i].wins);
						losses.push(rows[i].losses);
					}	
				}
				socket.emit("get-users-response", {global: false, users: usernames, nicknames: nicknames, wins: wins, losses: losses});
			}
		});
	}
	
	function startGame(room) {
		var deck = [];
		for (var i = 0; i < 3; i++) {
			for (var j = 0; j < 3; j++) {
				for (var k = 0; k < 3; k++) {
					for (var l = 0; l < 3; l++) {
						deck.push(i + " " + j + " " + k + " " + l); 
					}
				}
			}
		}
		deck = _.shuffle(deck);
		io.sockets.in(room).emit("start-game", {deck: deck});
	}
	
	function checkSet(picked) {
		var card1 = picked[0].split(" ");
		var card2 = picked[1].split(" ");
		var card3 = picked[2].split(" ");
		return true;
	}
});