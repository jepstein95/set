define([

  'jquery',
  'underscore',
  'backbone',
  'require',
  'views/base',
  'collections/users',
  'models/user'

], function($, _, Backbone, require, _View, Users, User) {
  return _View.extend({

    el: '.lobby',

    template: 'lobby',

    listeners: {
      'get-users-response': 'getUsersResponse' 
    },
    
    initialize: function() {
      this.users = new Users(null, { view: this });
      _View.prototype.initialize.apply(this);
      api.emit('get-users', {});
    },

    addUserLi: function(model) {
      //  $(challenge).click(function(event) {
      //    api.emit('challenge', { challenger: me.get('username'), other: model.get('username') });
      //    me.set('avail', false);
      //  });
      
      //$(li).hover(function() {
      //    $(this).find('div').show();
      //  },
      //  function() {
      //    $(this).find('div').hide();
      //});
      //$(ul).append(li) 
      var data = {
        username: model.get('username'),
        nickname: model.get('nickname'),
        wins: model.get('wins'),
        losses: model.get('losses'),
        room: me.get('room'),
        score: 0
      };
      
      var user = renderTemplate('user', data);
      $('.users').append(user);
    },
      
    resetUserList: function(model) {
      $('.users').empty();
    },

    getUsersResponse: function(content) {
      this.users.reset();
      for (var i = 0; i < content.users.length; i++) {
        var user = content.users[i];
        if (user != '' && user != me.get('username')) {
          var nickname = content.nicknames[i];
          var wins = content.wins[i];
          var losses = content.losses[i];
          this.users.add(new User({ username: user, nickname: nickname, wins: wins, losses: losses }));
        }
      }
    },
  });
});