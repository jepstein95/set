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
      'chat-messgae-response':  'chatMsgResponse'
    },

    initialize: function() {
      this.messages = new Messages(null, { view: this });
      _View.prototype.initialize.apply(this);
    },

    addMsgLi: function(model) {
      //var messsages = $('.messages');
      //var li = $('<li>');
      //var name = $('<b>');  
      //if (model.get('nickname') != '')
      //  $(name).text(model.get('username') + '(' + model.get('nickname') + '):');
      //else
      //  $(name).text(model.get('username') + ':');
      //var msg = $('<p>');
      //$(msg).text(model.get('message'));
      //$(li).append(name);
      //$(li).append(msg);
      //$(messages).append(li);
      var template = this.templatePath('chat/message.html');
      require([template], function(html) {
        var li = _.template(html, {
          username: model.get('username'),
          nickname: model.get('nickname'),
          message: model.get('message')
        });
        $('.messages').append(li);
      });
    },

    resetMsgList: function(model) {
      $('.messages').empty();
    },

    submitMsg: function() {
      var message = $('.chat-msg').val();
      $('.chat-msg').val('');
      api.emit('chat-message', { room: me.get('room'), username: me.get('username'), nickname: me.get('nickname'), message: message });
    },

    chatMsgResponse: function(content) {
      this.messages.add(new Message({ username: content.username, nickname: content.nickname, message: content.message }));
    },

    joinRoom: function() {
      this.messages.reset();
    },

    leave: function() {
      this.resetMsgList();
    }
  });
});