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
      //var self = this, template = this.templatePath(this.template);
      //require([template], function(html) {
      //  var div = _.template(html, {});
      //  self.$el.html(div);
      //});

      var div = this.renderTemplate(this.template, {});
      this.$el.append(div);
    },

    templatePath: function(template) {
      return 'text!templates/' + template;
    },

    renderTemplate: function(template, data) {
      return JST[template](data);
    }

  });
});