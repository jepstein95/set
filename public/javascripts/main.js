require.config({
  paths: {
    jquery: 'lib/jquery/jquery.min',
    underscore: 'lib/underscore/underscore.min',
    backbone: 'lib/backbone/backbone.min',
    handlebars: 'lib/handlebars/handlebars.min'
  },
  shim: {
    handlebars: {
      exports: 'handlebars'
    }
  }
});


require([

  'jquery',
  'underscore',
  'backbone',
  'views/frame',
  'models/me',
  'templates'

], function ($, _, Backbone, Frame, Me) {

  $(document).ready(function() {

    window.api = _({}).extend(Backbone.Events);
    window.me = new Me();

    var frame = new Frame(),

        ioEvents = [
          'connect-response',
          'get-users-response',
          'start-game',
          'set-call-response',
          'set-pick-response',
          'chat-message-response',
          'challenge-response',
          'challenged'
        ],

        socket = io.connect();

    // Register io events
    _.each(ioEvents, function(event) {
      socket.on(event, function(content) {
        api.trigger(event, content);
      });
    });

    // Give api access to socket
    api.emit = function(message, content) {
      socket.emit(message, content);
    }

    // Kick off connection
    socket.emit('connect', {});

  });

});