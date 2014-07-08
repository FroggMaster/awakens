var settings = require('./settings');
var email = require('emailjs');
var emailServer = email.server.connect(settings.emailServer);
var $ = require('jquery-deferred');
module.exports = {
    send : function(email, args) {
        var done = $.Deferred();
        var emailContent = {};
        for ( var key in email) {
            var value = email[key];
            var subst = args[key];
            if (subst) {
                for ( var i = 0; i < subst.length; i++) {
                    value = value.replace('{' + i + '}', subst[i]);
                }
            }
            emailContent[key] = value;
        }
        emailServer.send(emailContent, function(err, message) {
            console.log(err || message);
            if (err) {
                done.reject(err);
            } else {
                done.resolve(true);
            }
        });
        return done.promise();
    }
};