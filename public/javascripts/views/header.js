define([

  'jquery',
  'underscore',
  'backbone',
  'views/base'

], function($, _, Backbone, _View) {
  return _View.extend({

    el: '.header',

    template: 'header',

    events: {
      'click .logout': 'logout', 
    },

    listeners: {},

    initialize: function() {
      _View.prototype.initialize.apply(this);
      $('.title').text(me.get('username'));
    },

    logout: function() {
      window.location = '/logout';
    }

  });
});