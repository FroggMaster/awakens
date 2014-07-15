var THROTTLES = {};
var $ = require('jquery-deferred');
module.exports = {
    on : function(id, settings) {
        var done = $.Deferred();
        var max = (settings && settings.max) || 10;
        var resetTime = (settings && settings.time) || 1000;
        var t = THROTTLES[id] = THROTTLES[id] || {
            count : 0
        };
        if (t.count == 0) {
            setTimeout(function() {
                delete THROTTLES[id];
            }, resetTime);
        }
        if (++t.count > max) {
            done.reject();
        } else {
            done.resolve();
        }
        return done.promise();
    }
};