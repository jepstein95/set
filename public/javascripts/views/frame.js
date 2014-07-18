define([

  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'views/header',
  'views/lobby',
  'views/chat',
  'views/game'

], function($, _, Backbone, _View, Header, Lobby, Chat, Game) {
  
  return _View.extend({

    el: 'body',

    template: 'frame',

    listeners: {
      'connect-response':  'connectResponse'
    },

    initialize: function () {
      _View.prototype.initialize.apply(this);
    },

    connectResponse: function(content) {
      me.set('username', content.username);
      me.set('avail', true);

      // Render all subviews
      var header = new Header(),
          lobby = new Lobby(),
          chat = new Chat(),
          game = new Game();
    }
    
  });
  
});