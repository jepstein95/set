define([

  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'collections/cards',
  'models/card'

], function($, _, Backbone, _View, Cards, Card) {
  
  return _View.extend({

    el: '.game',

    template: 'game',

    colors: ['Red', 'Green', 'Blue'],
    numbers: [1, 2, 3],
    shapes: ['Ovals', 'Diamonds', 'Squiggles'],
    fills: ['Open', 'Shaded', 'Filled'],

    timer: null,
    canPick: false,
    picked: [],

    events: {
      'click .new':     'newGame',
      'click .set':     'setCall',
      'click .leave':   'leave'
    },

    listeners: {
      'join-room':              'joinRoom',
      'leave':                  'leave',
      'start-game':             'startGame',
      'set-call-response':      'setCallResponse',
      'set-pick-response':      'setPickResponse'
    },

    initialize: function() {
      this.cards = new Cards(null, { view: this });
      _View.prototype.initialize.apply(this);
    },

    newGame: function() {
      api.once('request-users-response', function(content) {
        var data = { users: content };
        var popup = this.renderTemplate('game/invite', data);
        this.$el.append(popup);
      }, this);
      api.trigger('request-users', {});
    },

    addCardLi: function(model) {
      var number = numbers[model.get('number')];
      var color = colors[model.get('color')];
      var shape = shapes[model.get('shape')];
      var fill = fills[model.get('fill')];
      var src = '/images/' + number + ' ' + color + ' ' + fill + ' ' + shape + ' (2).jpg';
      var card = $('<li>');
      var id = model.get('number') + ' ' + model.get('color') + ' ' + model.get('shape') + ' ' +  model.get('fill');
      card.attr('id', id);
      var img = $('<img>');
      img.addClass('card-img');
      img.attr('src', src);
      $(card).append(img);
      $(card).click(function(event) {
        if (canPick) {
          picked.push(id);
          if (picked.length == 3) {
            api.emit('set-pick', { bool: true, room: me.get('room'), username: me.get('username'), picked: picked });
            window.clearTimeout(timer);
            canPick = false;
            picked = [];
          }
        }
      });
      var size1 = $('.stack1 li').length;
      var size2 = $('.stack2 li').length;
      var size3 = $('.stack3 li').length;
      if ((size1 < size2) && (size1 < size3))
        $('.stack1').append(card);
      else if (size2 < size3)
        $('.stack2').append(card);
      else
        $('.stack3').append(card);
    },
      
    removeCardLi: function(model) {
      var number = model.get('number');
      var color = model.get('color');
      var shape = model.get('shape');
      var fill = model.get('fill');
      var id = '' + number + ' ' + color + ' ' +  shape + ' ' + fill;
      var toRemove = document.getElementById(id);
      $(toRemove).remove()
    },
      
    resetCards: function(model) {
      $('.stack1').empty();
      $('.stack2').empty();
      $('.stack3').empty();
    },

    joinRoom: function() {
      $('.room').css('visibility', 'visible');
    },

    setCall: function(room, username) {
      this.emit('set-call', { room: me.get('room'), username: me.get('username') });
    },

    setCallResponse: function(content) {
      if (content.username == me.get('username')) {
        canPick = true;
        $('.set-msg').text('Pick three cards.');
        timer = window.setTimeout(function() {
          canPick = false;
          picked = [];
          api.emit('set-pick', { bool: false, room: content.room });
        }, 3000);
      } else {
        $('.set-msg').text(content.username + ' called a set.');
      }
    },

    setPickResponse: function(content) {
      if (content.bool) {
        // update score
        $('.set-msg').text(content.username + ' got a set.');
        _.each(content.picked, function(value) {
          var chars = value.split(' ');
          var card = this.cards.findWhere({ number: chars[0], color: chars[1], shape: chars[2], fill: chars[3] });
          this.cards.remove(card);
        });
        this.drawCards(3);
      } else if (content.timeout) {
        $('.set-msg').text('Time up!');
      } else {
        $('.set-msg').text('Not a set.');
      }
    },

    leave: function() {
      api.trigger('leave');
      api.emit('leave-room', { room: me.get('room'), username: me.get('username') });
      me.set('room', null);
      me.set('avail', true);
    }

  });

});