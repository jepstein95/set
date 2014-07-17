define([

  'jquery',
  'underscore',
  'backbone',
  'collections/base',
  'models/card'

], function($, _, Backbone, _Collection, Card) {
  return _Collection.extend({
    initialize: function(models, options) {
      this.model = Card;
      this.bind('add', options.view.addCardLi, options.view);
      this.bind('remove', options.view.removeCardLi, options.view);
      this.bind('reset', options.view.resetCards, options.view);
    }
  });
});