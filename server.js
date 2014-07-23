var settings = require('./settings');
var msgs = settings.msgs;
var dao = require('./dao');
var throttle = require('./throttle');

var _ = require('underscore');
var $ = require('jquery-deferred');
var express = require('express');
var app = express();
var fs = require('fs');
var http = require('http');
var httpPort = settings.server.port;
var server;
var verifyByEmail = !!settings.emailServer;

/*
 * catch the uncaught errors that weren't wrapped in a domain or try catch
 * statement do not use this in modules, but only in applications, as otherwise
 * we could have multiple of these bound
 */
process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log(err);
});

if (settings.https) {
    var httpsPort = settings.https.port;
    var happ = express();
    var hserver = http.Server(happ);
    happ.get('*', function(req, res) {
        res.redirect('https://' + /^([^:]+)(?::\d+|)$/.exec(req.get('host'))[1] + (httpsPort == 443 ? '' : ':' + httpsPort) + req.url);
    });
    hserver.listen(httpPort, function() {
        console.log('http (for redirecting) listening on *:' + httpPort);
    });
    server = require('https').createServer({
        key : fs.readFileSync(settings.https.key),
        cert : fs.readFileSync(settings.https.cert)
    }, app);
    server.listen(httpsPort, function() {
        console.log('https listening on *:' + httpsPort);
    });
} else {
    server = http.Server(app);
    server.listen(httpPort, function() {
        console.log('http listening on *:' + httpPort);
    });
}

var io = require('socket.io')(server);

if (settings.server.compression) {
    app.use(require('compression')());
}

app.use(express.static(__dirname + '/public', settings.server.cache ? {
    maxAge : settings.server.cache
} : undefined));

var channels = {};

function getClientIp(socket) {
    return socket.request.connection.remoteAddress;
}

function start(channelName) {
    console.log('Starting channel: ' + (channelName || '<fontpage>'));

    var room = io.of('/' + channelName);
    var channel = channels[channelName] = {
        online : []
    };

    room.on('connection', function(socket) {
        var user = {
            remote_addr : getClientIp(socket),
            socket : socket
        };

        var log = {};
        [ 'error', 'info', 'debug' ].forEach(function(lvl) {
            log[lvl] = function() {
                if (settings.log[lvl]) {
                    var prefix = new Date().toString() + ' ' + lvl.toUpperCase() + ' [' + user.remote_addr;
                    if (user.nick) {
                        prefix += ',' + user.nick;
                    }
                    prefix += ']';
                    var args = _.toArray(arguments);
                    args.splice(0, 0, prefix);
                    console[lvl == 'error' ? 'error' : 'log'].apply(console, args);
                }
            };
        });

        log.info('New connection');

        socket.on('disconnect', function() {
            try {
                if (user.nick) {
                    var i = indexOf(user.nick);
                    if (i >= 0) {
                        channel.online.splice(i, 1);
                    } else {
                        log.info('Disconnected user was not found');
                    }
                    roomEmit('left', {
                        id : user.socket.id,
                        nick : user.nick
                    });
                }
                log.info('Disconnected');
            } catch (err) {
                console.error(err);
            }
        });

        // -----------------------------------------------------------------------------
        // COMMANDS
        // -----------------------------------------------------------------------------

        var COMMANDS = {
            nick : {
                params : [ 'nick' ],
                handler : function(dao, dbuser, params) {
                    return attemptNick(dao, params.nick.substring(0, settings.limits.nick));
                }
            },
            me : {
                params : [ 'message' ],
                handler : function(dao, dbuser, params) {
                    var message = params.message.substring(0, settings.limits.message)
                    roomEmit('message', {
                        type : 'action-message',
                        message : user.nick + ' ' + params.message
                    });
                    return $.Deferred().resolve(true);
                }
            },
            login : {
                params : [ 'nick', 'password' ],
                handler : function(dao, dbuser, params) {
                    var done = $.Deferred();
                    var nick = params.nick.substring(0, settings.limits.nick);
                    return dao.findUser(nick).then(function(u) {
                        if (u && u.get('verified')) {
                            return attemptNick(dao, nick, params.password);
                        } else {
                            return $.Deferred().resolve(false, msgs.nickNotVerified);
                        }
                    });
                }
            },
            unregister : {
                handler : function(dao, dbuser, params) {
                    return dbuser.unregister();
                }
            },
            register : {
                params : [ 'email_address', 'initial_password' ],
                handler : function(dao, dbuser, params) {
                    return dbuser.register(params.email_address, params.initial_password);
                }
            },
            verify : {
                params : verifyByEmail ? [ 'reenter_password', 'verification_code' ] : [ 'reenter_password' ],
                handler : function(dao, dbuser, params) {
                    return dbuser.verify(params.reenter_password, params.verification_code).done(function(success) {
                        success && socketEmit(socket, 'update', {
                            password : params.reenter_password
                        });
                    });
                }
            },
            banlist : {
                access_level : 1,
                handler : function(dao, dbuser, params) {
                    return dao.banlist().then(function(list) {
                        var msg;
                        if (list && list.length > 0) {
                            msg = msgs.get('banlist', list.join(', '));
                        } else {
                            msg = msgs.no_banned_global;
                        }
                        return $.Deferred().resolve(true, msg);
                    });
                }
            },
            channel_banlist : {
                access_level : 1,
                handler : function(dao, dbuser, params) {
                    return dao.banlist(channelName).then(function(list) {
                        var msg;
                        if (list && list.length > 0) {
                            msg = msgs.get('channel_banlist', list.join(', '));
                        } else {
                            msg = msgs.no_banned_channel;
                        }
                        return $.Deferred().resolve(true, msg);
                    });
                }
            },
            ban : {
                access_level : 1,
                params : [ 'id' ],
                handler : function(dao, dbuser, params) {
                    return dao.ban(params.id);
                }
            },
            unban : {
                access_level : 1,
                params : [ 'id' ],
                handler : function(dao, dbuser, params) {
                    return dao.unban(params.id);
                }
            },
            channel_ban : {
                access_level : 1,
                params : [ 'id' ],
                handler : function(dao, dbuser, params) {
                    return dao.ban(params.id, channelName);
                }
            },
            channel_unban : {
                access_level : 1,
                params : [ 'id' ],
                handler : function(dao, dbuser, params) {
                    return dao.unban(params.id, channelName);
                }
            },
            access : {
                access_level : 0,
                params : [ 'nick', 'access_level' ],
                handler : function(dao, dbuser, params) {
                    var done = $.Deferred();
                    return dao.findUser(params.nick).then(function(dbuser) {
                        if (dbuser) {
                            return dbuser.access(params.access_level).done(function(success) {
                                if (success) {
                                    channel.online.forEach(function(user) {
                                        if (user.nick == params.nick) {
                                            user.socket.emit('update', {
                                                access_level : dbuser.get('access_level')
                                            });
                                        }
                                    });
                                }
                            });
                        } else {
                            return $.Deferred().resolve(false, msgs.get('user_doesnt_exist', params.nick));
                        }
                    });
                }
            },
            whoami : {
                handler : function(dao, dbuser) {
                    showMessage(msgs.get('whoami', dbuser.get('nick'), dbuser.get('access_level'), user.remote_addr));
                    return $.Deferred().resolve(true).promise();
                }
            },
            whois : {
                access_level : 0,
                params : [ 'nick' ],
                handler : function(dao, dbuser, params) {
                    return dao.findUser(params.nick).then(function(dbuser) {
                        if (dbuser) {
                            return $.Deferred().resolve(true, msgs.get('whois', dbuser.get('nick'), dbuser.get('access_level'), dbuser.get('remote_addr')));
                        } else {
                            return $.Deferred().resolve(false, msgs.get('user_doesnt_exist', params.nick));
                        }
                    });
                }
            },
            find_ip : {
                access_level : 0,
                params : [ 'remote_addr' ],
                handler : function(dao, dbuser, params) {
                    return dao.find_ip(params.remote_addr).then(function(nicks) {
                        if (nicks.length > 0) {
                            showMessage(msgs.get('find_ip', params.remote_addr, nicks.join(', ')));
                        } else {
                            showMessage(msgs.get('find_ip_empty', params.remote_addr));
                        }
                        return true;
                    });
                }
            },
            note : {
                access_level : 1,
                params : [ 'message' ],
                handler : function(dao, dbuser, params) {
                    var message = params.message.substring(0, settings.limits.message);
                    return dao.setChannelInfo(channelName, 'notification', message).then(function() {
                        roomEmit('update', {
                            notification : message
                        });
                        return true;
                    });
                }
            },
            topic : {
                access_level : 2,
                params : [ 'topic' ],
                handler : function(dao, dbuser, params) {
                    var topic = params.topic.substring(0, settings.limits.message);
                    return dao.setChannelInfo(channelName, 'topic', topic).then(function() {
                        roomEmit('update', {
                            topic : topic
                        });
                        return true;
                    });
                }
            },
            pm : {
                params : [ 'nick', 'message' ],
                handler : function(dao, dbuser, params) {
                    var done = $.Deferred();
                    var to = indexOf(params.nick);
                    if (to >= 0) {
                        var toSocket = channel.online[to].socket;
                        var message = {
                            from : socket.id,
                            to : toSocket.id,
                            nick : user.nick,
                            type : 'personal-message',
                            message : params.message.substring(0, settings.limits.message)
                        };
                        socketEmit(socket, 'message', message);
                        toSocket != socket && socketEmit(toSocket, 'message', message);
                        done.resolve(true);
                    } else {
                        done.resolve(false, msgs.pmOffline);
                    }
                    return done.promise();
                }
            },
            refresh_client : {
                access_level : 0,
                handler : function(dao, dbuser, params) {
                    roomEmit('refresh');
                }
            },
            theme_style : {
                access_level : 0,
                params : [ 'theme_style' ],
                handler : function(dao, dbuser, params) {
                    var theme_style = params.theme_style.substring(0, settings.limits.message)
                    return dao.setChannelInfo(channelName, 'theme_style', theme_style).then(function() {
                        roomEmit('update', {
                            theme_style : theme_style
                        });
                        return true;
                    });
                }
            },
            theme : {
                access_level : 0,
                params : [ 'theme' ],
                handler : function(dao, dbuser, params) {
                    var theme = params.theme.substring(0, settings.limits.message)
                    return dao.setChannelInfo(channelName, 'theme', theme).then(function() {
                        roomEmit('update', {
                            theme : theme
                        });
                        return true;
                    });
                }
            },
            change_password : {
                params : [ 'old_password', 'new_password' ],
                handler : function(dao, dbuser, params) {
                    return dbuser.change_password(params.old_password, params.new_password).done(function(success) {
                        success && socketEmit(socket, 'update', {
                            password : params.new_password
                        });
                    });
                }
            },
            reset_user : {
                access_level : 0,
                params : [ 'nick' ],
                handler : function(dao, dbuser, params) {
                    return dao.findUser(params.nick).then(function(user) {
                        var err;
                        if (!user) {
                            err = msgs.get('user_doesnt_exist', params.nick);
                        } else if (!user.get('registered')) {
                            err = msgs.get('user_exist_not_registered', params.nick);
                        } else {
                            return user.unregister().then(function() {
                                return $.Deferred().resolve(true, msgs.get('reset_user', params.nick));
                            });
                        }
                        return $.Deferred().resolve(false, err);
                    });
                }
            },
            speak : {
                params : [ 'message' ],
                handler : function(dao, dbuser, params) {
                    var message = params.message;
                    if (message) {
                        if (dbuser.get('access_level') < 4) {
                            var al = dbuser.get('access_level');
                            var t = settings.speak[al];
                            if (t === undefined) {
                                t = settings.speak['default'];
                            }
                            if (t) {
                                return throttle.on('speak-' + al, t).then(function() {
                                    roomEmit('message', {
                                        nick : dbuser.get('nick'),
                                        type : 'spoken-message',
                                        message : message.substring(0, settings.limits.spoken)
                                    });
                                    return true;
                                }, function() {
                                    return $.Deferred().resolve(false, msgs.throttled);
                                });
                            } else {
                                roomEmit('message', {
                                    nick : dbuser.get('nick'),
                                    type : 'spoken-message',
                                    message : message.substring(0, settings.limits.spoken)
                                });
                            }
                        } else {
                            return $.Deferred().resolve(false, msgs.muted);
                        }
                    }
                    return $.Deferred().resolve(true);
                }
            }
        };

        // -----------------------------------------------------------------------------
        // MESSAGES
        // -----------------------------------------------------------------------------

        /*
         * These are all of the messages that can be received by the server.
         */
        _.each({
            join : function(dao, msg) {
                if (!user.nick) {
                    var nick = msg && msg.nick;
                    var pwd = msg && msg.password;
                    if (nick) {
                        var done = $.Deferred();
                        dao.isBanned(channelName, nick, user.remote_addr).then(function(isbanned) {
                            if (isbanned) {
                                log.debug('Join request, but user is banned');
                                errorMessage(msgs.banned);
                                socket.disconnect();
                            } else {
                                attemptNick(dao, nick, pwd).then(function() {
                                    done.resolve.apply(done, arguments);
                                }, function(err) {
                                    done.reject(err);
                                });
                            }
                        });
                        return done.promise();
                    } else {
                        return attemptNick(dao);
                    }
                } else {
                    log.debug('Join request, but user already online');
                    return $.Deferred().resolve(false).promise();
                }
            },
            message : function(dao, msg) {
                var done = $.Deferred();
                if (user.nick) {
                    var message = msg && msg.message;
                    if (typeof message == 'string') {
                        dao.findUser(user.nick).done(function(dbuser) {
                            if (dbuser.get('access_level') <= 3) {
                                roomEmit('message', {
                                    nick : user.nick,
                                    flair : typeof msg.flair == 'string' ? msg.flair.substring(0, settings.limits.message) : null,
                                    type : 'chat-message',
                                    message : message.substring(0, settings.limits.message)
                                });
                            } else {
                                errorMessage(msgs.muted);
                            }
                        }).always(function() {
                            done.resolve(true);
                        });
                    } else {
                        log.debug('Invalid message');
                        done.resolve(false);
                    }
                } else {
                    log.debug('User is not online');
                    done.resolve(false);
                }
                return done.promise();
            },
            request : function(dao, msg) {
            },
            command : function(dao, msg) {
                var err;
                if (user.nick) {
                    var cmd = COMMANDS[msg && msg.name];
                    if (cmd) {
                        var params = msg.params;
                        var valid = true;
                        if (cmd.params) {
                            valid = !_.any(cmd.params, function(param) {
                                return typeof params[param] != 'string' || !params[param];
                            });
                        }
                        if (valid) {
                            return dao.findUser(user.nick).then(function(dbuser) {
                                if (typeof cmd.access_level == 'number') {
                                    valid = cmd.access_level >= dbuser.get('access_level');
                                }
                                if (valid) {
                                    return cmd.handler(dao, dbuser, params) || $.Deferred().resolve(true);
                                } else {
                                    return $.Deferred().resolve(false, msgs.invalidCommandAccess);
                                }
                            });
                        } else {
                            err = msgs.invalidCommandParams;
                        }
                    } else {
                        err = msgs.invalidCommand;
                    }
                }
                return $.Deferred().resolve(false, err);
            }
        },

        /*
         * For each message wrap in a function which will check if the user is
         * banned or not.
         */
        function(fn, msg) {
            socket.on(msg, function() {
                var args = _.toArray(arguments);
                var banned_throttles = [];
                settings.throttle.banned.limits.forEach(function(limit, i) {
                    banned_throttles.push(throttle.on(i + '-banned-' + socket.id, limit));
                });
                $.when.apply($, banned_throttles).done(function() {
                    var throttles = [];
                    throttles.push(throttle.on(msg + 'Global', settings.throttle.global))
                    throttles.push(throttle.on(msg + '-' + channelName, settings.throttle.channel));
                    throttles.push(throttle.on(msg + '-' + socket.id, settings.throttle.user));
                    $.when.apply($, throttles).fail(function() {
                        errorMessage(msgs.throttled);
                    }).done(function() {
                        try {
                            log.debug('Received message: ', msg, args);
                            dao(function(dao) {
                                dao.isBanned(channelName, user.remote_addr, user.nick).done(function(banned) {
                                    log.debug('User is ' + (banned ? '' : 'not ') + 'banned');
                                    if (banned) {
                                        errorMessage(msgs.banned);
                                        socket.disconnect();
                                        dao.release();
                                    } else {
                                        args.splice(0, 0, dao);
                                        fn.apply(null, args).done(handleResponse).always(function() {
                                            dao.release();
                                        });
                                    }
                                });
                            });
                        } catch (err) {
                            console.error(err);
                        }
                    });
                }).fail(function() {
                    dao(function(dao) {
                        errorMessage(msgs.temporary_ban);
                        dao.ban(user.remote_addr);
                        dao.release();
                        socket.disconnect();
                    });
                    setTimeout(function() {
                        dao(function(dao) {
                            dao.unban(user.remote_addr);
                            dao.release();
                        });
                    }, settings.throttle.banned.unban);
                });
            });
        });

        // -----------------------------------------------------------------------------
        // INNER FUNCTIONS
        // -----------------------------------------------------------------------------

        /**
         * @inner
         * @param {Object} dao
         * @return {$.Promise<boolean>}
         */
        function initClient(dao) {
            var done = $.Deferred();
            dao.isBanned(channelName, user.remote_addr).then(function(banned) {
                if (banned) {
                    errorMessage(msgs.banned);
                    socket.disconnect();
                    done.resolve(false);
                } else {
                    var users = _.map(channel.online, function(user) {
                        return {
                            id : user.socket.id,
                            nick : user.nick
                        };
                    });
                    socketEmit(socket, 'online', users);
                    dao.getChannelInfo(channelName).then(function(channelInfo) {
                        socketEmit(socket, 'update', channelInfo);
                        done.resolve(true);
                    }, function(err) {
                        done.reject(err);
                    });
                }
            }, function(err) {
                done.reject(err);
            });
            return done.promise();
        }

        /**
         * @inner
         * @param {Socket} socket
         */
        function socketEmit(socket) {
            var args = _.toArray(arguments);
            args.splice(0, 1);
            log.debug('socket emit', JSON.stringify(args));
            socket.emit.apply(socket, args);
        }

        /**
         * @inner
         */
        function roomEmit() {
            log.debug('room emit', JSON.stringify(_.toArray(arguments)));
            room.emit.apply(room, arguments);
        }

        /**
         * @param {boolean} success
         * @param {string} message
         */
        function handleResponse(success, message) {
            if (message) {
                socketEmit(socket, 'message', {
                    type : success ? null : 'error-message',
                    message : message
                });
            }
        }

        /**
         * @param {string} message
         */
        function errorMessage(message) {
            showMessage(message, 'error-message');
        }

        /**
         * @param {string} message
         * @param {string=} type
         */
        function showMessage(message, type) {
            socketEmit(socket, 'message', {
                type : type,
                message : message
            });
        }

        /**
         * @inner
         * @param {string} nick
         * @returns {number}
         */
        function indexOf(nick) {
            for ( var i = 0; i < channel.online.length; i++) {
                if (channel.online[i].nick == nick) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * @inner
         * @param {Object} dao
         * @param {string=} nick
         * @param {string=} password
         * @returns {$.Deferred}
         */
        function attemptNick(dao, nick, password) {
            var done = $.Deferred();

            /**
             * @inner
             */
            function fallback() {
                dao.nextNick().then(function(nick) {
                    log.debug('Nick fallback to ', nick);
                    attemptNick(dao, nick).then(function(success, errorMessage) {
                        done.resolve(success, errorMessage);
                    }, function(err) {
                        done.reject(err);
                    });
                }, function(err) {
                    done.reject(err);
                });
            }

            /**
             * @inner
             */
            function attempt(dbuser, password) {
                if (indexOf(dbuser.get('nick')) >= 0) {
                    log.debug('Attempted to nick to ', dbuser.get('nick'), ' but someone else is using that nick right now');
                    if (user.nick) {
                        done.resolve(false, msgs.alreadyBeingUsed);
                    } else {
                        fallback();
                    }
                } else {
                    dbuser.set('remote_addr', user.remote_addr).then(function() {
                        var online = !!user.nick;
                        user.nick = dbuser.get('nick');
                        socketEmit(socket, 'update', {
                            id : socket.id,
                            nick : dbuser.get('nick'),
                            access_level : dbuser.get('access_level'),
                            password : password || null
                        });
                        if (online) {
                            roomEmit('nick', {
                                id : socket.id,
                                nick : dbuser.get('nick')
                            });
                        } else {
                            channel.online.push(user);
                            log.debug('Successful join!');
                            roomEmit('join', {
                                id : socket.id,
                                nick : dbuser.get('nick')
                            });
                        }
                        done.resolve(true);
                    }, function(err) {
                        done.reject(err);
                    });
                }
            }

            if (nick && typeof nick == 'string') {
                dao.findUser(nick).then(function(dbuser) {
                    if (dbuser) {
                        if (dbuser.get('verified')) {
                            if (password) {
                                if (dbuser.verifyPassword(password)) {
                                    log.debug('Nick password was correct');
                                    attempt(dbuser, password);
                                } else {
                                    log.debug('Nick password was incorrect');
                                    if (user.nick) {
                                        done.resolve(false, msgs.invalidLogin);
                                    } else {
                                        fallback();
                                    }
                                }
                            } else if (user.nick) {
                                done.resolve(false, msgs.nickVerified);
                            } else {
                                fallback();
                            }
                        } else {
                            log.debug('Nick was not registered');
                            attempt(dbuser);
                        }
                    } else {
                        log.debug('Nick ', nick, ' does not exist, creating a new nick');
                        dao.createUser(nick, user.remote_addr).then(attempt, function(err) {
                            done.reject(err);
                        });
                    }
                }, function(err) {
                    done.reject(err);
                });
            } else {
                fallback();
            }

            return done.promise();
        }

        // -----------------------------------------------------------------------------
        // INITIALIZE THE CLIENT
        // -----------------------------------------------------------------------------

        try {
            dao(function(dao) {
                initClient(dao).always(function() {
                    dao.release();
                });
            });
        } catch (err) {
            console.error(err);
        }
    });
}

var channelRegex = /^\/(\w*\/?)$/;
app.get(channelRegex, function(req, res) {
    try {
        var host = req.headers.host;
        var channelName = channelRegex.exec(req.url)[1];
        if (host != 'this.spooks.me') {
            channelName = host + '/' + channelName;
        }
        channels[channelName] || start(channelName);
        var index = fs.readFileSync('index.html').toString();
        _.each({
            channel : channelName,
            verifyByEmail : verifyByEmail
        }, function(value, key) {
            index = index.replace('${' + key + '}', value);
        });
        res.send(index);
    } catch (err) {
        console.error(err);
    }
});