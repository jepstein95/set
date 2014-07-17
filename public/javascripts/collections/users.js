define([

  'jquery',
  'underscore',
  'backbone',
  'collections/base',
  'models/user'

], function($, _, Backbone, _Collection, User) {
  return _Collection.extend({
    initialize: function (models, options) {
      this.model = User;
      this.bind('add', options.view.addUserLi, options.view);
      this.bind('reset', options.view.resetUserList, options.view);
    }
  });
});