define([

  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'views/lobby',
  'views/chat',
  'views/game'

], function($, _, Backbone, _View, Lobby, Chat, Game) {
  return _View.extend({

    el: 'body',

    template: 'frame',

    events: {
      'click .logout': 'logout',
      'click .leave':  'leave'
    },

    listeners: {
      'connect-response':     'connectResponse',
      'challenge-response':   'challengeReponse',
      'challenged':           'challenged'
    },

    initialize: function () {
      _View.prototype.initialize.apply(this);
    },

    logout: function() {
      window.location = '/logout';
    },

    leave: function() {
      api.trigger('leave');
      api.emit('leave-room', { room: me.get('room'), username: me.get('username') });
      me.set('room', null);
      me.set('avail', true);
    },

    connectResponse: function (content) {
      $('.title').text(content.username);
      me.set('username', content.username);
      me.set('avail', true);


      // Render all subviews
      var lobby = new Lobby(),
          chat = new Chat(),
          game = new Game();
    },

    challengeResponse: function(content) {
      if (content.success && content.challenger == me.get('username')) {
        if (content.accept) {
          api.emit('join-room', { room: content.challenger, username: me.get('username') });
          me.set('room', content.challenger);
          api.trigger('join-room');
        } else {
          alert('CHALLENGE NOT ACCEPTED');
          me.set('avail', true);
        }
      }
    },

    challenged: function(content) {
      if (content.other == me.get('username')) {
        var accept;
        if (me.get('avail'))
          accept = confirm('Accept challenge from user ' + content.challenger + '?');
        else
          accept = false;
        api.emit('challenged-response', { accept: accept, challenger: content.challenger, other: content.other });
        if (accept) {
          api.emit('join-room', { room: content.challenger, username: me.get('username') });
          me.set('avail', false);
          me.set('room', content.challenger);
          api.trigger('join-room');
        }
      }
    }
    
  });
});