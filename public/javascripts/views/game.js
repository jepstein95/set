define([

  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'collections/cards',
  'models/card'

], function($, _, Backbone, _View, Cards, Card) {
  
  return _View.extend({

    el: '.game',

    template: 'game',

    events: {
      'click .new':       'newGame',
      'click .start':     'startGame',
      'click .set':       'setCall',
      'click .card':      'selectCard', 
      'click .leave':     'leave'
    },

    listeners: {
      'join-room':                  'joinRoom',
      'leave':                      'leave',
      'join-game':                  'joinGame',
      'start-game-response':        'startGameResponse',
      'join-game-response':         'joinGameResponse',
      'set-call-response':          'setCallResponse',
      'set-pick-response':          'setPickResponse',
      'card-selected-response':     'cardSelected',
      'game-update':                'updateGame'
    },

    initialize: function() {
      _View.prototype.initialize.apply(this);

      this.cards = new Cards(null, { view: this });
      this.picked = [];
      this.timer = null;
      this.canPick = false;
    },

    newGame: function() {
      var room = me.get('username');
      me.set('room', room);
      api.emit('new-game', {
        username: me.get('username'),
        room: me.get('username')
      });

      this.render({ room: room });

      //api.once('request-users-response', function(content) {
      //  var popup = this.renderTemplate('game/invite', { users: content });
      //  this.$el.append(popup);
      //}, this);
      //api.trigger('request-users', {});
    },

    joinGame: function(room) {
      me.set('room', room);
      api.emit('join-game', {
        username: me.get('username'),
        room: room
      });
    },

    startGame: function() {
      api.emit('start-game', { room: me.get('room') });
    },

    startGameResponse: function(content) {
      this.render({ room: me.get('room'), started: true });
      this.updateGame(content);
    },

    joinGameResponse: function(content) {
      this.render({ room: me.get('room'), started: content.started });
      this.updateGame(content);
    },

    updateGame: function(content) {
      var self = this;
      _.each(content.cards, function(card) {
        self.cards.add(new Card({
          number: card[0],
          color: card[1],
          fill: card[2],
          shape: card[3]
        }));
      });
      $('.deck-size').text('Cards left: ' + content.deckSize);
    },

    addCardLi: function(model) {

      var colors = ['Red', 'Green', 'Blue'],
          numbers = [1, 2, 3],
          shapes = ['Ovals', 'Diamonds', 'Squiggles'],
          fills = ['Open', 'Shaded', 'Filled'];

      var number = numbers[model.get('number')];
      var color = colors[model.get('color')];
      var shape = shapes[model.get('shape')];
      var fill = fills[model.get('fill')];
      var src = '/images/' + number + ' ' + color + ' ' + fill + ' ' + shape + ' (2).jpg';
      var card = $('<li>');
      var id = model.get('number') + ' ' + model.get('color') + ' ' + model.get('shape') + ' ' +  model.get('fill');
      card.attr('id', id);
      card.attr('class', 'card');
      var img = $('<img>');
      img.attr('id', id);
      img.addClass('card-img');
      img.attr('src', src);
      $(card).append(img);
      var size1 = $('.stack1 li').length;
      var size2 = $('.stack2 li').length;
      var size3 = $('.stack3 li').length;
      if ((size1 < size2) && (size1 < size3))
        $('.stack1').append(card);
      else if (size2 < size3)
        $('.stack2').append(card);
      else
        $('.stack3').append(card);
    },
      
    removeCardLi: function(model) {
      var number = model.get('number');
      var color = model.get('color');
      var shape = model.get('shape');
      var fill = model.get('fill');
      var id = '' + number + ' ' + color + ' ' +  shape + ' ' + fill;
      var toRemove = document.getElementById(id);
      $(toRemove).remove()
    },
      
    resetCards: function(model) {
      $('.stack1').empty();
      $('.stack2').empty();
      $('.stack3').empty();
    },

    setCall: function(room, username) {
      api.emit('set-call', { room: me.get('room'), username: me.get('username') });
    },

    setCallResponse: function(content) {
      if (content.username == me.get('username')) {
        $('.set-msg').text('Pick three cards.');
        this.canPick = true;
        this.timer = window.setTimeout(function() {
          api.emit('timeout', { room: me.get('room') });
        }, 6000);
      } else {
        $('.set-msg').text(content.username + ' called a set.');
      }
    },

    selectCard: function(e) {
      if (this.canPick) {
        $(e.target).addClass('selected');
        api.emit('card-selected', {
          username: me.get('username'),
          room: me.get('room'),
          card: $(e.target).attr('id')
        });
      }
    },

    cardSelected: function(content) {
      var id = '#' + content.card;
      $(id).addClass('selected');
    },

    setPickResponse: function(content) {
      
      if (content.username == me.get('username')) {
        window.clearTimeout(this.timer);
        this.canPick = false;
      }

      if (content.bool) {
        $('.set-msg').text(content.username + ' got a set.');
        _.each(content.picked, function(value) {
          var chars = value.split(' ');
          var card = this.cards.findWhere({ number: chars[0], color: chars[1], shape: chars[2], fill: chars[3] });
          this.cards.remove(card);
        });
      } else if (content.timeout) {
        $('.set-msg').text('Time up!');
      } else {
        $('.set-msg').text('Not a set.');
      }
    },

    leave: function() {
      api.trigger('leave');
      api.emit('leave-room', {
        room: me.get('room'),
        username: me.get('username')
      });
      me.set('room', null);
      this.canPick = false;
      this.timer = null;
    }

  });

});