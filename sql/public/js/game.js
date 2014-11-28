(function() {
    var socket = null;

    GameModel = Backbone.Model.extend({
        initialize : function() {
        },

        send : function(msg) {
        }
    });

    window.Game = {
        init : function(socket) {
            socket = socket;
        }
    };
})();