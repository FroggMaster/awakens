(function($) {
    var IMAGE = '/css/img/classic-playing-cards.png';
    var SIZE = [ 72, 96 ]; // width, height
    var MARGIN = [ 1, 2 ];// x, y

    CardUtil = {
        valid : function() {
            return card >= 0 && card < 52;
        },
        face : function(card) {
            return valid(card) ? card % 13 : -1;
        },
        suit : function(card) {
            return valid(card) ? Math.floor(card / 4) : -1;
        }
    };

    $.widget('games.Card', {
        options : {
            card : 0,
            shown : true,
            theme : 0
        },
        _setOptions : function() {
            this._superApply(arguments);
            this._refresh();
        },
        _refresh : function() {
            var xOff = (this.options.shown ? this.options.value : this.options.theme) * (SIZE[0] + MARGIN[0]);
            var yOff = (this.options.shown ? this.options.suit : 4) * (SIZE[1] + MARGIN[1]);
            this.element.css({
                backgroundPosition : (-xOff) + 'px ' + (-yOff) + 'px'
            });
        },
        _create : function() {
            this.element.css({
                background : 'url(' + IMAGE + ')',
                width : SIZE[0] + 'px',
                height : SIZE[1] + 'px'
            });
            this._refresh();
        }
    });
})(jQuery);