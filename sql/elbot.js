var request = require('request');
var _ = require('underscore');
var $ = require('jquery-deferred');
var userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:30.0) Gecko/20100101 Firefox/30.0';

function getResponse(body) {
    var response = /<!-- Begin Response !-->(.*)<!-- End Response !-->/.exec(body)[1];
    if (response) {
        response = response.replace(/<!--.*-->/g, '');
    }
    return response.trim();
}

module.exports = {
    start : function() {
        var result = $.Deferred();
        var params = {};
        var queue = [];

        function updateParams(body) {
            params.IDENT = /"IDENT" value="([^"]+)\"/.exec(body)[1];
            params.USERLOGID = /"USERLOGID" value="([^"]+)\"/.exec(body)[1];
            params.EXTRAINPUT = /"EXTRAINPUT" value="([^"]+)\"/.exec(body)[1];
            params.IDENT = /"IDENT" value="([^"]+)\"/.exec(body)[1];
        }

        function enqueue(query, next) {
            queue.push({
                query : query,
                next : next
            });
            if (queue.length == 1) {
                dequeue();
            }
        }

        function dequeue() {
            var next = queue[0].next;
            var query = queue[0].query;
            request.post({
                url : 'http://elbot_e.csoica.artificial-solutions.com/cgi-bin/elbot.cgi',
                form : _.extend({
                    ENTRY : query
                }, params)
            }, function(error, response, body) {
                if (error || response.statusCode != 200) {
                    next.reject('Error calling elbot');
                } else {
                    updateParams(body);
                    next.resolve(getResponse(body));
                }
                queue.splice(0, 1);
                if (queue.length > 0) {
                    dequeue();
                }
            });
        }

        request.get({
            url : 'http://elbot_e.csoica.artificial-solutions.com/cgi-bin/elbot.cgi?START=normal',
            headers : {
                'User-Agent' : userAgent
            }
        }, function(error, response, body) {
            if (error || response.statusCode != 200) {
                result.reject('Error calling elbot');
            } else {
                updateParams(body);
                result.resolve({
                    next : function(query) {
                        var next = $.Deferred();
                        if (typeof query == 'string' && query) {
                            enqueue(query, next);
                        } else {
                            next.reject('Invalid query');
                        }
                        return next.promise();
                    }
                }, getResponse(body));
            }
        });
        return result.promise();
    }
}