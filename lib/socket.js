var socketio = require('socket.io'),
    _ = require('underscore'),
    database = require('./database'),
    sanitizer = require('sanitizer');

module.exports = function(io) {
  
  var users = [],
      games = [];
  
  // DEVELOPMENT
  var db = [
    { username: "josh", nickname: "squid", wins: 10, losses: 3 },
    { username: "babou", nickname: "", wins: 0, losses: 9 },
    { username: "jorge", nickname: "", wins: 1, losses: 4 },
    { username: "beaver", nickname: "", wins: 1, losses: 4 },
    { username: "nadie", nickname: "", wins: 1, losses: 4 }
  ];
  
  // ON: CONNECTION
  io.sockets.on('connection', function(socket) {
    var hs = socket.handshake.session;
    
    users.push({
      username: hs.user,
      room: null
    });

    if (!hs.users) { hs.users = users; }

    
    socket.on('connect', function(content) {
      socket.emit('connect-response', { username: sanitizer.escape(hs.user) });
      broadcastUserInfo();
    });
    
    // ON: GET-USERS
    socket.on('get-users', function(content) {
      broadcastUserInfo();
    });
  
    // ON: CHAT-MESSAGE
    socket.on('chat-message', function(content) {
      if (content.room == null) {
        io.sockets.emit('chat-message-response', {
          room: content.room,
          username: content.username,
          nickname: content.nickname,
          message: sanitizer.escape(content.message)
        });
      } else {
        io.sockets.in(content.room).emit('chat-message-response', {
          room: content.room,
          username: content.username,
          nickname: content.nickname,
          message: sanitizer.escape(content.message)
        });
      }
    });
  
    // ON: CHALLENGE
    //socket.on('challenge', function(content) {
    //  if (_.contains(users, content.other)) {
    //    socket.broadcast.emit('challenged', { challenger: content.challenger, other: content.other });
    //  } else {
    //    socket.emit('challenge-response', { success: false });
    //  }
    //});
  
    // ON: CHALLENGED-RESPONSE
    //socket.on('challenged-response', function(content) {
    //  socket.broadcast.emit('challenge-response', { success: true, accept: content.accept, challenger: content.challenger, other: content.other });
    //});

    // ON: JOIN-ROOM
    //socket.on('join-room', function(content) {
    //  socket.join(content.room);
    //  rooms[content.username] = content.room;
    //  canCall[content.room] = true;
    // broadcastUserInfo(true, null);
    //  braodcastUserInfoRoom(false, content.room);
    //  broadcastUserInfoRoom(true, content.room);
    //  var inRoom = 0;
    //  _.each(rooms, function(value, key) {
    //    if (value == content.room)
    //      inRoom++;
    //  });
    //  if (inRoom > 1) {
    //    startGame(content.room);
    //  }
    //});

    // ON: NEW-GAME
    socket.on('new-game', function(content) {
      socket.join(content.room);
      var user = _.find(users, function(user) {
        return user.username == content.username;
      });
      if (user) user.room = content.room;
      broadcastUserInfo();
    });

    // ON: JOIN-GAME
    socket.on('join-game', function(content) {
      socket.join(content.room);
      var user = _.find(users, function(user) {
        return user.username == content.username;
      });
      if (user) user.room = content.room;
      broadcastUserInfo();

      var game = _.find(games, function(game) {
        return game.room == content.room;
      });

      if (game && game.started) {
        socket.emit('join-game-response', {
          started: true,
          cards: game.field,
          deckSize: _.size(game.deck)
        });
      } else {
        socket.emit('join-game-response', {
          started: false
        });
      }
    });

    // ON: START-GAME
    socket.on('start-game', function(content) {
      var room = {
        room: content.room,
        deck: newDeck(),
        field: [],
        started: true,
        canCall: true,
        selected: []
      };
      var cards = drawCards(room.deck, 9);
      room.field = cards;
      games.push(room);
      io.sockets.in(content.room).emit('start-game-response', {
        cards: room.field,
        deckSize: _.size(room.deck)
      });
    });
  
    // ON: SET-CALL
    socket.on('set-call', function(content) {
      var room = get(games, 'room', content.room);
      if (room && room.canCall) {
        io.sockets.in(content.room).emit('set-call-response', {
          username: content.username
        });
        room.canCall = false;
      }
    });

    socket.on('card-selected', function(content) {
      io.sockets.in(content.room).emit('card-selected-response', {
        card: content.card
      });
      var room = get(games, 'room', content.room);
      room.selected.push(content.card);
      if (_.size(room.selected) == 3) {
        if (checkSet(room.selected)) {
          io.sockets.in(content.room).emit('set-pick-response', {
            bool: true,
            username: content.username,
            selected: room.selected
          });
        } else {
          io.sockets.in(content.room).emit('set-pick-response', {
            bool: false,
            timeout: false
          });
        }
        room.selected = [];
        room.canCall = true;
      } 
    });

    socket.on('timeout', function(content) {
      io.sockets.in(content.room).emit('set-pick-response', {
        bool: false,
        timeout: true
      });
      var room = get(games, 'room', content.room);
      room.selected = [];
      room.canCall = true;
    });
  
    // ON: SET-PICK
    socket.on('set-pick', function(content) {
      var room = get(games, 'room', content.room);
      room.canCall = true;
      if (content.bool) {
        if (checkSet(content.picked)) {
          io.sockets.in(content.room).emit('set-pick-response', {
            bool: true,
            username: content.username,
            picked: content.picked
          });
        } else {
          io.sockets.in(content.room).emit('set-pick-response', {
            bool: false,
            timeout: false
          });
        }
      } else {
        io.sockets.in(content.room).emit('set-pick-response', {
          bool: false,
          timeout: true
        });
      }
    });
  
    // ON: LEAVE-ROOM
    socket.on('leave-room', function(content) {
      socket.leave(content.room);
      var user = get(users, 'username', content.username);
      if (user) user.room = null;
      broadcastUserInfo();
    });
  
    // ON: LOGOUT-USER
    socket.on('logout-user', function(content) {
      users = _.filter(users, function(user) { user.username != content.user; })
      broadcastUserInfo();
    });
  
    // ON: DISCONNECT
    socket.on('disconnect', function() {
      console.log('User disconnected: ' + hs.user);
    });
  
    /*
    // BROADCAST USER INFO
    function broadcastUserInfo() {
      database.query('SELECT * FROM users', function(err, rows, fields) {

        // DEVELOPMENT
        rows = rows || db;

        if (rows && rows[0] != null) {
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
    */
  
    // EMIT USER INFO
    function broadcastUserInfo() {
      
      //database.query('SELECT * FROM users', function(err, rows, fields) {

        // DEVELOPMENT
        var rows = db;

        if (rows) {

          var data = { users: [] };

          _.each(users, function(u) {
            var row = get(rows, 'username', u.username);
            var user = {
              username: row.username,
              nickname: row.nickname,
              wins: row.wins,
              losses: row.losses,
              room: u.room
            };
            data.users.push(user);
          });

          io.sockets.emit('get-users-response', data);


          /*
          var room = options.room,
              quiet = options.quiet,
              toSend = [];

          _.each(users, function(user) {
            if (room && user.room === room) {
              toSend.push(user.username);
            }
            else if (!room) {
              toSend.push(user.username);
            }
          });

          var data = {
            room: (room ? true : false),
            users: []
          };

          _.each(rows, function(row) { 
            if (_.contains(toSend, row.username)) {
              var user = {
                username: row.username,
                nickname: row.nickname,
                wins: row.wins,
                losses: row.losses,
                room: _.find(users, function(u) {
                        return u.username == row.username;
                      }).room
              };
              data.users.push(user);
            } 
          });

          if (!quiet && !room)
            socket.broadcast.emit('get-users-response', data);
          else if (!quiet && room)
            socket.broadcast.to(room).emit('get-users-response', data);
          else if (quiet && !room)
            socket.emit('get-users-response', data);
          else
            socket.emit('get-users-response', data);
          */
        }
    //});
    }
  
    /*
    // BROADCAST USER INFO TO A ROOM
    function broadcastUserInfoRoom(room) {
      database.query('SELECT * FROM users', function(err, rows, fields) {

        // DEVELOPMENT
        rows = rows || db;

        if (rows && rows[0] != null) {
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

        // DEVELOPMENT
        rows = rows || db;

        if (rows && rows[0] != null) {
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
    */

    // GET
    function get(arr, property, value) {
      return _.find(arr, function(item) {
        return item[property] == value;
      });
    }
  
    // NEW DECK
    function newDeck() {
      var deck = [];
      for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
          for (var k = 0; k < 3; k++) {
            for (var l = 0; l < 3; l++) {
              deck.push([i, j, k, l]); 
            }
          }
        }
      }
      return _.shuffle(deck);
    }

    // DRAW CARDS
    function drawCards(deck, num) {
      if (num > _.size(deck))
        return false;
      else
        return deck.splice(0, num);
    }
  
    // CHECK SET
    function checkSet(picked) {
      var card1 = picked[0];
      var card2 = picked[1];
      var card3 = picked[2];
      for (var i = 0; i < 4; i++) {
        if (!checkProps(card1[i], card2[i], card3[i]))
          return false;
      }
      return true;
    }

    // CHECK PROPS
    function checkProps(prop1, prop2, prop3) {
      // If each property is the same, return true
      if (prop1 == prop2 == prop3)
        return true;

      // Or, if each property is different, return true
      if ((prop1 != prop2) && (prop2 != prop3) && (prop3 != prop1))
        return true;

      // Otherwise the cards do not form a set
      return false;
    }

  });
}
