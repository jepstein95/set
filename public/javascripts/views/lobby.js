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

    events: {
      'mouseover .room':    'showJoin',
      'mouseleave .room':   'hideJoin',
      'click .join':        'joinGame'
    },

    listeners: {
      'get-users-response': 'getUsersResponse',
      'request-users':      'usersRequest' 
    },
    
    initialize: function() {
      _View.prototype.initialize.apply(this);
      this.users = new Users(null, { view: this });
      api.emit('get-users', {});
    },

    addUserLi: function(model) {
      var data = {
        username: model.get('username'),
        nickname: model.get('nickname'),
        wins: model.get('wins'),
        losses: model.get('losses'),
        room: model.get('room'),
        myRoom: me.get('room'),
        score: 0
      };
      
      var user = this.renderTemplate('user', data);
      $('.users').append(user);
    },
      
    resetUserList: function(model) {
      $('.users').empty();
    },

    getUsersResponse: function(content) {
      //for (var i = 0; i < content.usernames.length; i++) {
      //  var user = content.usernames[i];
      //  if (user != '' && user != me.get('username')) {
      //    var nickname = content.nicknames[i];
      //    var wins = content.wins[i];
      //    var losses = content.losses[i];
      //    this.users.add(new User({
      //      username: user,
      //      nickname: nickname,
      //      wins: wins,
      //      losses: losses
      //    }));
      //  }
      //}
      var self = this;
      this.users.reset();

      if (me.get('room')) {
        _.each(content.users, function(user) {
          if (user.room == me.get('room'))
            self.users.add(new User(user));
        });
      } else {
        _.each(content.users, function(user) {
          if (user.username != me.get('username'))
            self.users.add(new User(user));
        });
      }
    },

    showJoin: function(e) {
      $(e.target).find('.join').addClass('visible');
    },

    hideJoin: function(e) {
      $(e.target).find('.join').removeClass('visible');
    },

    joinGame: function(e) {
      var room = $(e.target).attr('name');
      api.trigger('join-game', room);
    },

    usersRequest: function() {
      var usernames = this.users.pluck('username');
      api.trigger('request-users-response', usernames);
    }
  });

});