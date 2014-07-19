define([

  'jquery',
  'underscore',
  'backbone'

], function($, _, Backbone) {
  return Backbone.Model.extend({
    username: null,
    nickname: null,
    wins: null,
    losses: null,
    room: null
  });
});