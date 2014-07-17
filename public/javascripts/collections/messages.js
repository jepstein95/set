define([

  'jquery',
  'underscore',
  'backbone',
  'collections/base',
  'models/message'

], function($, _, Backbone, _Collection, Message) {
  return _Collection.extend({
    initialize: function (models, options) {
      this.model = Message;
      this.bind('add', options.view.addMsgLi, options.view);
      this.bind('reset', options.view.resetMsgList, options.view);
    }
  });
});