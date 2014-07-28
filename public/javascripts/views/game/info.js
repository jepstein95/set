define([

  'jquery',
  'underscore',
  'backbone',
  'views/base',

], function($, _, Backbone, _View, Cards, Card) {
  
  return _View.extend({

    el: '.game-info',

    template: 'game/info',

    events: {
      'click .new':       'newGame',
      'click .start':     'startGame',
      'click .set':       'setCall',
      'click .leave':     'leave'
    },

    listeners: {
      'leave':                      'leave',
      'join-game':                  'joinGame',
      'start-game-response':        'startGameResponse',
      'join-game-response':         'joinGameResponse',
      'set-call-response':          'setCallResponse',
      'set-pick-response':          'setPickResponse',
      'game-update':                'updateGame'
    },

    initialize: function() {
      _View.prototype.initialize.apply(this);
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
    },

    joinGameResponse: function(content) {
      this.render({ room: me.get('room'), started: content.started });
    },

    setCall: function(room, username) {
      api.emit('set-call', { room: me.get('room'), username: me.get('username') });
    },

    setCallResponse: function(content) {
      if (content.username == me.get('username'))
        $('.set-msg').text('Pick three cards.');
      else
        $('.set-msg').text(content.username + ' called a set.');
    },

    setPickResponse: function(content) {
      if (content.bool)
        $('.set-msg').text(content.username + ' got a set.');
      else if (content.timeout)
        $('.set-msg').text('Time up!');
      else
        $('.set-msg').text('Not a set.');
    },

    updateGame: function(content) {
      $('.deck-size').text('Cards left: ' + content.deckSize);
    },

    leave: function() {
      api.trigger('leave');
      api.emit('leave-room', {
        room: me.get('room'),
        username: me.get('username')
      });
      me.set('room', null);
    }

  });

});