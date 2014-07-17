define([

  'jquery',
  'underscore',
  'backbone'

], function($, _, Backbone) {
  return Backbone.Model.extend({
    number: null,
    color: null,
    shape: null,
    fill: null
  });
});