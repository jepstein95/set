define([

  'jquery',
  'underscore',
  'backbone'

], function($, _, Backbone) {
  return Backbone.Model.extend({
    username: null,
    nickname: null,
    message: null
  });
});