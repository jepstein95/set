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
      var cards = drawCards(room.deck, 12);
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

      // Handle timeouts
      _.delay(function() {
        if (!room.canCall) {
          io.sockets.in(content.room).emit('set-pick-response', {
            bool: false,
            timeout: true
          });
          room.selected = [];
          room.canCall = true;
        }
      }, 6000);
    });

    socket.on('card-selected', function(content) {
      io.sockets.in(content.room).emit('card-selected-response', {
        card: content.card
      });
      var room = get(games, 'room', content.room);
      room.selected.push(content.card);
      if (_.size(room.selected) == 3) {

        // Is a set
        if (checkSet(room.selected)) {
          io.sockets.in(content.room).emit('set-pick-response', {
            bool: true,
            username: content.username,
            selected: room.selected
          });

          // Send game update
          dealCards(room);
          _.delay(function() {
            io.sockets.in(content.room).emit('game-update', {
              cards: room.field,
              deckSize: _.size(room.deck)
            });
          }, 1000);

        // Is not a set
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
        }
    //});
    }

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

    // DEAL CARDS
    function dealCards(room) {
      var rep = drawCards(room.deck, _.size(room.selected));
      _.each(room.selected, function(selected) {
        for (var i = 0; i < _.size(room.field); i++) {
          if (room.field[i].equals(selected)) {
            if (rep) room.field[i] = rep.splice(0, 1)[0];
            else room.field.splice(i, 1);
          }
        }
      });
    }
  
    // CHECK SET
    function checkSet(picked) {
      var card1 = picked[0];
      var card2 = picked[1];
      var card3 = picked[2];
      //for (var i = 0; i < 4; i++) {
      //  if (!checkProps(card1[i], card2[i], card3[i]))
      //    return false;
      //}
      return true;
    }

    // CHECK PROPS
    function checkProps(prop1, prop2, prop3) {
      // If each property is the same, return true
      if ((prop1 == prop2) && (prop2 == prop3))
        return true;

      // Or, if each property is different, return true
      if ((prop1 != prop2) && (prop2 != prop3) && (prop3 != prop1))
        return true;

      // Otherwise the cards do not form a set
      return false;
    }

    Array.prototype.equals = function (array) {
      if (!array) return false;
      if (this.length != array.length) return false;
      for (var i = 0; i < _.size(this); i++) {         
        if (this[i] != array[i])
          return false;          
      }       
      return true;
    }   

  });
}
