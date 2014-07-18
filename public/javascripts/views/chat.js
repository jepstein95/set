define([

  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'collections/messages',
  'models/message'

], function($, _, Backbone, _View, Messages, Message) {
  
  return _View.extend({

    el: '.chat',

    template: 'chat',

    events: {
      'click .submit-msg': 'submitMsg'
    },

    listeners: {
      'join-room':              'joinRoom',
      'leave':                  'leave',
      'chat-message-response':  'chatMsgResponse'
    },

    initialize: function() {
      _View.prototype.initialize.apply(this);
      this.messages = new Messages(null, { view: this });
    },

    addMsgLi: function(model) {
      var data = {
        username: model.get('username'),
        nickname: model.get('nickname'),
        message: model.get('message')
      };

      var msg = this.renderTemplate('message', data);
      $('.messages').append(msg);
    },

    resetMsgList: function(model) {
      $('.messages').empty();
    },

    submitMsg: function() {
      var message = $('.chat-msg').val();
      $('.chat-msg').val('');
      api.emit('chat-message', {
        room: me.get('room'),
        username: me.get('username'),
        nickname: me.get('nickname'),
        message: message
      });
    },

    chatMsgResponse: function(content) {
      this.messages.add(new Message({
        username: content.username,
        nickname: content.nickname,
        message: content.message
      }));
    },

    joinRoom: function() {
      this.messages.reset();
    },

    leave: function() {
      this.resetMsgList();
    }
  });

});