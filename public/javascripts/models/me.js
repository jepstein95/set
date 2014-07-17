define([

  'jquery',
  'underscore',
  'backbone'

], function($, _, Backbone) {
  return Backbone.Model.extend({
    username: null,
    nickname: null,
    room: null,
    avail: false
  });
});