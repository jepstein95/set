var socketio = require('socket.io'),
    _ = require('underscore'),
    database = require('./database'),
    sanitizer = require('sanitizer');

module.exports = function(io) {
  
  var users = [],
      rooms = {},
      canCall = {};
  
  // ON: CONNECTION
  io.sockets.on('connection', function(socket) {
    var hs = socket.handshake;
    console.log('User connected: ' + hs.session.user);
    users.push(hs.session.user);
    
    socket.on('connect', function(content) {
      socket.emit('connect-response', { username: sanitizer.escape(hs.session.user) });
      broadcastUserInfo();
    });
    
    // ON: GET-USERS
    socket.on('get-users', function(content) {
      emitUserInfo();
    });
  
    // ON: CHAT-MESSAGE
    socket.on('chat-message', function(content) {
      if (content.room == null) {
        io.sockets.emit('chat-message-response', { room: content.room, username: content.username, nickname: content.nickname, message: sanitizer.escape(content.message) });
      } else {
        io.sockets.in(content.room).emit('chat-message-response', { room: content.room, username: content.username, nickname: content.nickname, message: sanitizer.escape(content.message) });
      }
    });
  
    // ON: CHALLENGE
    socket.on('challenge', function(content) {
      if (_.contains(users, content.other)) {
        socket.broadcast.emit('challenged', { challenger: content.challenger, other: content.other });
      } else {
        socket.emit('challenge-response', { success: false });
      }
    });
  
    // ON: CHALLENGED-RESPONSE
    socket.on('challenged-response', function(content) {
      socket.broadcast.emit('challenge-response', { success: true, accept: content.accept, challenger: content.challenger, other: content.other });
    });

    // ON: JOIN-ROOM
    socket.on('join-room', function(content) {
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
    socket.on('set-call', function(content) {
      canCall[content.room] = true;
      if (canCall[content.room]) {
        io.sockets.in(content.room).emit('set-call-response', { username: content.username });
        canCall[content.room] = false;
      }
    });
  
    // ON: SET-PICK
    socket.on('set-pick', function(content) {
      console.log(canCall[content.room]);
      if (content.bool) {
        if (checkSet(content.picked)) {
          io.sockets.in(content.room).emit('set-pick-response', { bool: true, username: content.username, picked: content.picked });
        } else {
          io.sockets.in(content.room).emit('set-pick-response', { bool: false, timeout: false });
        }
      } else {
        io.sockets.in(content.room).emit('set-pick-response', { bool: false, timeout: true });
      }
    });
  
    // ON: LEAVE-ROOM
    socket.on('leave-room', function(content) {
      socket.leave(content.room);
      rooms[content.username] = null;
      broadcastUserInfo();
      emitUserInfo();
      broadcastUserInfoRoom(content.room);
    });
  
    // ON: LOGOUT-USER
    socket.on('logout-user', function(content) {
      var index = users.indexOf(content.username); // indexOf --> NO IE
      users.splice(index, 1);
      broadcastUserInfo();
    });
  
    // ON: DISCONNECT
    socket.on('disconnect', function() {
      console.log('User disconnected: ' + hs.session.user);
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
          socket.broadcast.emit('get-users-response', { global: true, users: usernames, nicknames: nicknames, wins: wins, losses: losses });
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
          socket.emit('get-users-response', { global: true, users: usernames, nicknames: nicknames, wins: wins, losses: losses });
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
          socket.broadcast.to(room).emit('get-users-response', { global: false, users: usernames, nicknames: nicknames, wins: wins, losses: losses });
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
          socket.emit('get-users-response', { global: false, users: usernames, nicknames: nicknames, wins: wins, losses: losses });
        }
      });
    }
  
    // START GAME
    function startGame(room) {
      var deck = [];
      for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
          for (var k = 0; k < 3; k++) {
            for (var l = 0; l < 3; l++) {
              deck.push(i + ' ' + j + ' ' + k + ' ' + l); 
            }
          }
        }
      }
      deck = _.shuffle(deck);
      io.sockets.in(room).emit('start-game', { deck: deck });
    }
  
    function checkSet(picked) {
      var card1 = picked[0].split(' ');
      var card2 = picked[1].split(' ');
      var card3 = picked[2].split(' ');
      return true;
    }
  });
}