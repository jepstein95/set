define([

  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'views/game/info',
  'collections/cards',
  'models/card'

], function($, _, Backbone, _View, GameInfo, Cards, Card) {
  
  return _View.extend({

    el: '.game',

    template: 'game',

    events: {
      'click .card':  'selectCard'
    },

    listeners: {
      'leave':                      'leave',
      'join-game':                  'joinGame',
      'start-game-response':        'startGameResponse',
      'join-game-response':         'joinGameResponse',
      'set-call-response':          'setCallResponse',
      'set-pick-response':          'setPickResponse',
      'card-selected-response':     'cardSelected',
      'game-update':                'updateGame'
    },

    initialize: function() {
      _View.prototype.initialize.apply(this);

      this.gameInfo = new GameInfo();

      this.cards = new Cards(null, { view: this });
      this.canPick = false;
    },

    startGameResponse: function(content) {
      this.updateGame(content);
    },

    joinGameResponse: function(content) {
      this.updateGame(content);
    },

    updateGame: function(content) {
      var self = this;
      this.cards.reset();
      _.each(content.cards, function(card) {
        self.cards.add(new Card({
          number: card[0],
          color: card[1],
          fill: card[2],
          shape: card[3]
        }));
      });
    },

    addCardLi: function(model) {
      var src = this.src(model),
          id  = this.id(model);
      
      var card = $('<li>');
      card.attr('id', id);
      card.attr('class', 'card');

      var div = $('<div>');
      div.attr('class', 'pips');
      
      for (var i = 0; i <= model.get('number'); i++) {
        var img = $('<img>');
        img.addClass('pip');
        img.attr('src', src);
        $(div).append(img);
      }

      $(card).append(div);
      this.addToField(card);
    },

    addToField: function(card) {
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
      
    resetCards: function() {
      $('.stack').empty();
    },

    setCallResponse: function(content) {
      if (content.username == me.get('username'))
        this.canPick = true;
    },

    selectCard: function(e) {
      if (this.canPick) {
        api.emit('card-selected', {
          username: me.get('username'),
          room: me.get('room'),
          card: this.toArray($(e.target).attr('id'))
        });
      }
    },

    cardSelected: function(content) {
      var id = '#' + this.cardId(content.card);
      $(id).addClass('selected');
    },

    setPickResponse: function(content) {
      this.canPick = false;
      if (content.bool) {
        _.each(content.picked, function(pick) {
          var card = this.cards.findWhere({
            number: pick[0],
            color: pick[1],
            shape: pick[2],
            fill: pick[3]
          });
          this.cards.remove(card);
        });
      }
    },

    leave: function() {
      this.canPick = false;
    },

    src: function(model) {
      var colors  = ['red', 'green', 'purple'],
          fills   = ['open', 'shaded', 'filled'],
          shapes  = ['oval', 'diamond', 'squiggle'],

          color   = colors[model.get('color')],
          fill    = fills[model.get('fill')],
          shape   = shapes[model.get('shape')];

      return '/images/' + color + '_' + fill + '_' + shape + '.png';
    },

    id: function(model) {
      return cardId([
        model.get('number'),
        model.get('color'),
        model.get('fill'),
        model.get('shape')
      ]);
    },

    cardId: function(card) {
      return 'a' + card.join('');
    },

    toArray: function(id) {
      var array = id.split('').splice(1,4);
      return array.map(function(val) {
        return parseInt(val, 10);
      });
    }

  });

});