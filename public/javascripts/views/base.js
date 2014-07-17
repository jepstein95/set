define([

  'jquery',
  'underscore',
  'backbone'

], function($, _, Backbone) {
  return Backbone.View.extend({

    initialize: function() {
      this.registerEvents();
      this.render();
    },

    registerEvents: function() {
      var self = this;
      _.each(this.listeners, function(callback, event) {
          self.listenTo(api, event, self[callback]);
      });
    },

    render: function() {
      var div = this.renderTemplate(this.template, {});
      this.$el.append(div);
    },

    renderTemplate: function(template, data) {
      return JST[template](data);
    }

  });
});