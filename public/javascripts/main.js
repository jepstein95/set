require.config({
  paths: {
    jquery: 'lib/jquery/jquery.min',
    underscore: 'lib/underscore/underscore.min',
    backbone: 'lib/backbone/backbone.min',
    handlebars: 'lib/handlebars/handlebars.min'
  },
  shim: {
    'handlebars': {
      exports: 'Handlebars'
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
        socket = io.connect();

    // Override socket.$emit to trigger api events
    socket.$emit = function() {
      api.trigger.apply(api, arguments);
    }

    // Give api access to socket
    api.emit = function(message, content) {
      socket.emit(message, content);
    }

    // Kick off connection
    socket.emit('connect', {});

  });

});