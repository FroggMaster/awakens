var settings = require('./settings');
var msgs = settings.msgs;
var dao = require('./dao');
var throttle = require('./throttle');
var request = require('request');
var hasher = require('./md5');

var _ = require('underscore');
var $ = require('jquery-deferred');
var express = require('express');
var fs = require('fs');
var httpsPort = settings.https && settings.https.port;
var httpPort = settings.server.port;

/*
 * catch the uncaught errors that weren't wrapped in a domain or try catch
 * statement do not use this in modules, but only in applications, as otherwise
 * we could have multiple of these bound
 */
process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log(err);
});

function createChannel(io, channelName) {
    console.log('Starting channel: ' + (channelName || '<fontpage>'));

    var elbot = require('./elbot').start();
    var room = io.of('/' + channelName);
    var roles = ['god','super','admin','mod','basic','mute'];
    var channel = {
        online : []
    };
    var tokenCache = {};
    var count = 0;
    var command_access = {
        bg : ['mod',0],
        topic : ['mod',0],
        theme : ['admin',0],
        note : ['admin',0],
        lock  : ['admin',0]
    };
    
    room.on('connection', function(socket) {
        
        var user = {
            remote_addr : socket.request.connection.remoteAddress,
            socket : socket
        };
        
        if(!socket.request.connection.remoteAddress){
            user.remote_addr = socket.handshake.address;
        }
        
        if(socket.handshake.headers["x-real-ip"]){
            user.remote_addr = socket.handshake.headers["x-real-ip"];
            console.log(user.nick + ' ip masked')
        }
                
        socket.on('SetPart', function(parts){
            user.part = parts.toString();
        });
     
        socket.on('alive', function(){
            user.alive = true
        });
 
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
        
        setTimeout(function(){
            if(indexOf(user.nick) == -1){
                socket.disconnect();
            }
        }, 15000);
        
        //log.info('New connection');
        
        socket.on('disconnect', function() {
            try {
                if (user.nick) {
                    var i = indexOf(user.nick);
                    if (i >= 0) {
                        channel.online.splice(i, 1);
                    } else {
                        log.info('Disconnected user was not found');
                    }
                    count++;
                    roomEmit('updateCount',{
                    	count : count
                    });
                    roomEmit('left', {
                        id : user.socket.id,
                        nick : user.nick,
                        part : user.part
                    });
                }
                //log.info('Disconnected');
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
                    if ((params.nick.replace(/\s+/g, '')) != ''){
                        return attemptNick(dao, params.nick.substring(0, settings.limits.nick));
                    }
                    socketEmit(socket,'message',{
                        message : 'Invalid: /nick <nick>',
                        type : 'error-message'
                    })
                }
            },
            me : {
                params : [ 'message' ],
                handler : function(dao, dbuser, params) {
                    var message = params.message.substring(0, settings.limits.message);
                    count++;
                    roomEmit('message', {
                        type : 'action-message',
                        message : user.nick + ' ' + params.message,
                        count : count
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
                            if(!user.nick || user.nick.toLowerCase() != u.get('nick').toLowerCase()){
                                return attemptNick(dao, nick, params.password);
                            } else {
                                errorMessage('You\'re already logged in...');
                            }
                        } else {
                           return $.Deferred().resolve(false, msgs.nickNotVerified);
                        }
                    });
                }
            },
            logout : {
                handler : function(dao, dbuser, params){
                    if (!user.login){
                        errorMessage('You are not logged in!');
                    } else {
                        return attemptNick(dao);
                    }
                }
            },
            unregister : {
                handler : function(dao, dbuser, params) {
                    return dbuser.unregister();
                }
            },
            register : {
                params : [ 'initial_password' ],
                handler : function(dao, dbuser, params) {
                    dao.createUser(user.nick, user.remote_addr).done(function() {
                        dao.findUser(user.nick).then(function(dbuser){
                            dbuser.register(params.initial_password).then(function(){
                                if (settings.api && settings.api.recaptcha){
                                    showMessage(msgs.registeredAndVerified)
                                    socketEmit(socket,'passverify');
                                    console.log(user.nick + ' has been registered')
                                } else {
                                    console.log("The API key for recaptcha is missing. This error statement will soon be replaced with\nnormal verification.");
                                }
                            });
                        });
                    });
                }
            },
            banlist : {
                role : 'admin',
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
            permabanlist : {
                role : 'admin',
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
            permaban : {
                role : 'super',
                params : [ 'nick', 'message' ],
                handler : function(dao, dbsender, params) {
                    return dao.findUser(params.nick).then(function(dbuser){
                        if(dbuser){
                            if(roles.indexOf(user.role) <= roles.indexOf(dbuser.get('role'))){
                                return dao.ban(params.nick);
                            } else {
                                errorMessage('You may not ban admins');
                            }
                        } else {
                            return dao.ban(params.nick);
                        }
                    });
                }
            },
            unpermaban : {
                role : 'super',
                params : [ 'id' ],
                handler : function(dao, dbuser, params) {
                    broadcast(dao, dbuser.get("nick")+" has unbanned "+params.id);
                    return dao.unban(params.id);
                }
            },
            ban : {
                role : 'admin',
                params : [ 'nick', 'message' ],
                handler : function(dao, dbuser, params) {
                    return dao.findUser(params.nick).then(function(dbuser){
                        return dao.getChannelInfo(channelName).then(function(info){
                            var msg = params.message.length > 1 ? ': ' + params.message.trim() : '';
                            var nick = dbuser ? dbuser.get('nick') : params.nick;
                            var permit = 0;
                            var stats = grab(nick);
                            if(stats == -1){
                                access = JSON.parse(info.access);
                                if(!access[nick]){
                                    errorMessage(nick + ' has not joined since the last update and is not online.');
                                    return false;
                                } else {
                                    return {
                                        "role":access[nick].role,
                                        "access_level":access[nick].access_level
                                    }
                                }
                            }
                            if(roles.indexOf(user.role) < roles.indexOf(stats.role)){
                                permit = 1
                            } else {
                                permit = 0
                            }
                            if(permit){
                                if(stats.socket){
                                    socketEmit(stats.socket, 'message', {
                                        type : 'error-message',
                                        message : msgs.get(msg.length > 0 ? 'banned_reason' : 'banned_by', user.nick, msg)
                                    });
                                    stats.socket.disconnect();
                                }
                                broadcastChannel(dao, channel, user.nick + ' has channel banned ' + nick+msg);
                                return dao.ban(nick, channelName);
                            } else {
                                errorMessage('Can\'t ban user with higher role then your own.');
                            }
                        });
                    });
                }
            },
            unban : {
                role : 'admin',
                params : [ 'id' ],
                handler : function(dao, dbuser, params) {
                    broadcastChannel(dao, channel, dbuser.get("nick")+" has channel unbanned "+params.id);
                    return dao.unban(params.id, channelName);
                }
            },
            unban_all : {
                role : 'super',
                handler : function(dao, dbuser, params) {
                    return dao.unban_all(channelName).then(function(){
                        broadcastChannel(dao, channel, msgs.get('clear_channel', user.nick));
                    })
                }
            },
            banip : {
                role : 'admin',
                access_level : 0,
                params : [ 'nick' ],
                handler : function(dao, dbuser, params) {
                    var stats = grab(params.nick);
                    if (stats != -1) {
                        if(roles.indexOf(user.role) < roles.indexOf(stats.role)){
                            return dao.ban(stats.remote_addr, channelName);
                        } else {
                            errorMessage('You may not ban admins');
                        }
                    } else {
                        errorMessage('That IP is not online');
                    }
                }
            },
            kick : {
                role : 'mod',
                params : [ 'nick', 'message' ],
                handler : function(dao, dbuser, params) {
                    var kuser = indexOf(params.nick);
                    var permit = 0;
                    if(kuser != -1){
                        kuser = channel.online[kuser]
                        fuser = grab(params.nick);
                        if(roles.indexOf(user.role) < roles.indexOf(fuser.role)){
                            permit = 1
                        } else if(user.role == fuser.role && user.access_level < fuser.access_level){
                            permit = 1
                        }
                        if(permit){
                            msg = params.message.length > 1 ? ': ' + params.message.trim() : '';
                            socketEmit(kuser.socket, 'message', {
                                type : 'error-message',
                                message : msgs.get(msg.length > 0 ? 'kicked_reason' : 'kicked', user.nick, msg)
                            });
                            kuser.socket.disconnect();
                            broadcastChannel(dao, channel, user.nick + " has kicked " + params.nick + msg);
                        } else {
                            errorMessage('You may not kick admins');
                        }
                    } else {
                        errorMessage(params.nick  +' is not online');
                    }
                }
            },
            access : {
                role : 'admin',
                access_level : 0,
                params : [ 'role', 'access_level', 'nick' ],
                handler : function(dao, dbuser, params) {
                    if(roles.indexOf(params.role) >= 2 && params.access_level >= 0 && params.access_level <= 10000){
                        var done = $.Deferred();
                        var stats = grab(params.nick);
                        var permit = 0;
                        return dao.findUser(params.nick).then(function(dbuser) {
                            if (dbuser && dbuser.get('verified')) {
                                var nick = dbuser.get('nick');
                                if(stats == -1){
                                    stats = GetInfo(nick)
                                }
                                if(roles.indexOf(user.role) <= 1 || user.role == 'admin' && user.access_level == 0){
                                    permit = 1
                                } else {
                                    if(roles.indexOf(params.role) >= roles.indexOf(user.role) && roles.indexOf(stats.role) >= roles.indexOf(user.role)){
                                        if(params.access_level >= user.access_level && stats.access_level >= user.access_level){
                                            permit = 1
                                        }
                                    }
                                }
                                if(permit){
                                    console.log('ACCESS_GIVEN ' + user.nick + ' - ' + channelName + ' - ' + nick)
                                    dao.getChannelInfo(channelName).then(function(channelInfo) {
                                        access = JSON.parse(channelInfo.access);
                                        if(params.role == 'basic'){
                                            delete access[nick]
                                        } else {
                                            access[nick] = {'role':params.role,'access_level':params.access_level};
                                        }
                                        dao.setChannelInfo(channelName, 'access', JSON.stringify(access)).then(function(){
                                            channel.online.forEach(function(user) {
                                                if (user.nick == nick) {
                                                    user.role = params.role;
                                                    user.access_level = params.access_level;
                                                    user.socket.emit('update', {
                                                        access_level : user.access_level.toString(),
                                                        role : user.role
                                                    });
                                                }
                                            });
                                            roomEmit('update',{
                                                access : JSON.stringify(access)
                                            });
                                            showMessage(nick + ' now has role ' + params.role + ' and access_level ' + params.access_level)
                                        });
                                    });
                                } else {
                                    return $.Deferred().resolve(false, 'Can\'t put someones access above your own.');
                                }
                            } else {
                                return $.Deferred().resolve(false, msgs.get('user_doesnt_exist', params.nick));
                            }
                        });
                    } else {
                        errorMessage('Invalid role or access_level')
                    }
                }
            },
            access_global : {
                role : 'god',
                params : [ 'access_level', 'nick' ],
                handler : function(dao, dbuser, params) {
                    if(params.access_level >= 0){
                        var done = $.Deferred();
                        var permit;
                        return dao.findUser(params.nick).then(function(dbuser) {
                            if(dbuser) {
                                return dbuser.access('super', params.access_level).done(function(success) {
                                    if (success) {
                                        channel.online.forEach(function(user) {
                                            if (user.nick == params.nick.toLowerCase()) {
                                                user.socket.emit('update', {
                                                    access_level : dbuser.get('access_level'),
                                                    role : dbuser.get('role')
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                return $.Deferred().resolve(false, msgs.get('user_doesnt_exist', params.nick));
                            }
                        });
                    } else {
                        errorMessage('Invalid access_level')
                    }
                }
            },
            mute_user : {
                role : 'super',
                params : [ 'nick' ],
                handler : function(dao, dbuser, params){
                    var stats = grab(params.nick);
                    var to = indexOf(params.nick);
                    if(stats.role != 'mute'){
                        channel.online[indexOf(params.nick)].role = 'mute';
                        showMessage(params.nick + ' has been muted.')
                    } else {
                        channel.online[indexOf(params.nick)].role = 'basic';
                        showMessage(params.nick + ' has been unmuted.')
                    }
                }
            },
            whoami : {
                handler : function(dao, dbuser) {
                    showMessage(msgs.get('whoami', user.nick, user.role,user.access_level, user.remote_addr));
                    return $.Deferred().resolve(true).promise();
                }
            },
            whois : {
                params : [ 'nick' ],
                handler : function(dao, dbuser, params) {
                    return dao.findUser(params.nick).then(function(dbuser) {
                        var stats = grab(params.nick)
                        var reg,mask;
                        if(stats != -1 || dbuser) {
                            if(dbuser){
                                if(roles.indexOf(dbuser.get('role')) <= 1){
                                    stats = {
                                        role : dbuser.get('role'),
                                        access_level : dbuser.get('access_level'),
                                    }
                                } else {
                                    stats = GetInfo(params.nick);
                                }
                                stats.remote_addr = dbuser.get('remote_addr');
                                stats.vHost = dbuser.get('vHost');
                                stats.nick = dbuser.get('nick');
                                reg = (dbuser.get('registered') ? 'registered' : 'not registered');
                                mask = (dbuser.get('vHost') ? dbuser.get('vHost') : 'Private');
                            } else {
                                reg = 'not registered';
                                mask = 'Private'
                            }
                            if (roles.indexOf(user.role) <= 1) {
                                showMessage(msgs.get('whois', stats.nick, stats.role, stats.access_level, stats.remote_addr,stats.vHost, reg));
                            } else if (roles.indexOf(user.role) >= 2) {
                                showMessage(msgs.get('whoiss', stats.nick, stats.role, stats.access_level, mask, reg));
                            }
                        } else {
                            return $.Deferred().resolve(false, msgs.get('user_doesnt_exist', params.nick));
                        }
                    });
                }
            },
            find : {
                role : 'super',
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
                params : [ 'topic' ],
                handler : function(dao, dbuser, params) {
                    var topic = params.topic.substring(0, settings.limits.message);
                    return dao.setChannelInfo(channelName, 'topic', topic).then(function() {
                    	count++;
                    	roomEmit('updateCount',{
                    	    count : count
                    	});
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
                            type : 'personal-message',
                            from : socket.id,
                            to : toSocket.id,
                            nick : user.nick,
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
            refresh : {
                role : 'super',
                handler : function(dao, dbuser, params) {
                    roomEmit('refresh');
                }
            },
            bg : {
                params : [ 'theme_style' ],
                handler : function(dao, dbuser, params) {
                    var background = params.theme_style.substring(0, settings.limits.message);
                    return dao.setChannelInfo(channelName, 'background', background).then(function() {
                        roomEmit('update', {
                            background : background
                        });
                        return true;
                    });
                }
            },
            theme : {
                params : [ 'input_style', 'scrollbar_style' ],
                handler : function(dao, dbuser, params) {
                    var input = [params.input_style.substring(0, settings.limits.message), params.scrollbar_style.substring(0, settings.limits.message)];
                    return dao.setChannelInfo(channelName, 'chat_style', input.toString()).then(function() {
                        roomEmit('update', {
                            chat_style : input.toString()
                        });
                        return true;
                    });
                }
            },
            change_password : {
                params : [ 'old_password', 'new_password' ],
                handler : function(dao, dbuser, params) {
                    return dbuser.change_password(params.old_password, params.new_password).done(function(success) {
                        /*success && socketEmit(socket, 'update', {
                            password : params.new_password
                        });*/
                    });
                }
            },
            reset : {
                role : 'super',
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
                params : [ 'message', 'voice' ],
                handler : function(dao, dbuser, params) {
                    var voices = ['default','yoda','clever', 'old', 'loli', 'whisper', 'badguy', 'aussie', 'terrorist', 'japan', 'alien', 'nigga', 'demon'];
                    var message = voices.indexOf(params.voice) <= 0 ? params.voice : params.message;
                    var voice = voices.indexOf(params.voice) >= 0 ? params.voice : 'default'
                    if (message) {
                        if (roles.indexOf(user.role) <= 5) {
                            var al = roles.indexOf(user.role);
                            var t = settings.speak[al];
                            if (t === undefined) {
                                t = settings.speak['default'];
                            }
                            request('http://2s4.me/speak/' + params.voice + 'speak.php?text=' + encodeURIComponent(params.message), function (error, response, body) {
                                if(voice == 'default') {
                                    body = null
                                };
                                return throttle.on('speak-' + al, t).then(function() {
                                    roomEmit('message', {
                                        type : 'spoken-message',
                                        nick : dbuser.get('nick'),
                                        message : message.substring(0, settings.limits.spoken),
                                        source : body,
                                        voice : voice
                                    });
                                return true;
                                }, function() {
                                    return $.Deferred().resolve(false, msgs.throttled);
                                });
                            });
                        } else {
                            return $.Deferred().resolve(false, msgs.muted);
                        }
                    }
                        return $.Deferred().resolve(true);
                }
            },
            elbot : {
                params : [ 'message' ],
                handler : function(dao, dbuser, params) {
                    roomEmit('message', {
                        type : 'elbot-message',
                        nick : dbuser.get('nick'),
                        message : params.message
                    });
                    return elbot.then(function(elbot) {
                        return elbot.next(params.message).then(function(msg) {
                            roomEmit('message', {
                                nick : 'Elbot Chat Bot',
                                type : 'elbot-response',
                                message : msg
                            });
                            return $.Deferred().resolve(true);
                        });
                    });
                }
            },
            anon : {
                params : [ 'message' ],
                handler : function(dao, dbuser, params) {
                    var message = params.message.substring(0, settings.limits.message)
                    roomEmit('message', {
                        type : 'anon-message',
                        message : message,
                        name : user.nick
                    });
                    return $.Deferred().resolve(true);
                }
            },
            part : {
                params : [ 'message' ],
                handler : function(dao, dbuser, params) {
                    var message = params.message.substring(0, settings.limits.part)
                    message = message.replace(/\r?\n|\r/g, '');
                    user.part = message
                    socketEmit(socket, 'update', {
                        part : user.part
                    });
                return $.Deferred().resolve(true);
                }
            },
            private : {
                role : 'super',
                handler : function(dao, dbuser, params){
                    dao.getChannelInfo(channelName, 'private').then(function(info){
                        if (info.private == 1){
                            errorMessage('Channel is already private');
                        } else {
                            dao.setChannelInfo(channelName, 'private', 1).then(function(){
                                showMessage('Channel has been made private');
                                channel.online.forEach(function(user){
                                    dao.findUser(user.nick).done(function(dbuser) {
                                        if (!dbuser || dbuser.get('verified') == 0){
                                            errorMessage('Channel is private.');
                                            user.socket.disconnect();
                                        }
                                    });
                                });
                            });
                        }
                    });
                }
            },
            public : {
                role : 'super',
                handler : function(dao, dbuser, params){
                    dao.getChannelInfo(channelName, 'private').then(function(info){
                        if (info.private == 0){
                            errorMessage('Channel is already public');
                        } else {
                            dao.setChannelInfo(channelName, 'private', 0).then(function(){
                                showMessage('Channel has been made public')
                            });
                        }
                    });
                }
            },
            invite : {
                role : 'super',
                params : [ 'nick' ],
                handler : function(dao, dbuser, params){
                    dao.findUser(params.nick).then(function(dbuser){
                        if(dbuser){
                            dao.getChannelInfo(channelName).then(function(info){
                                var nick = dbuser.get('nick');
                                if(info.whitelist){
                                    whitelist = JSON.parse(info.whitelist);
                                    if(!whitelist[nick]){
                                        whitelist[nick] = {remote_addr:dbuser.get('remote_addr')};
                                        dao.setChannelInfo(channelName, 'whitelist', JSON.stringify(whitelist)).then(function(){
                                            showMessage(nick + ' has been invited.')
                                        });
                                    } else {
                                        showMessage(nick + ' has already been invited.')
                                    }
                                } else {
                                    whitelist = {};
                                    whitelist[nick] = {'remote_addr':dbuser.get('remote_addr')};
                                    dao.setChannelInfo(channelName, 'whitelist', JSON.stringify(whitelist)).then(function(){
                                        showMessage(nick + ' has been invited.')
                                    }); 
                                }
                            });
                        } else {
                            errorMessage('User isn\'t registered.')
                        }
                    });
                }
            },
            uninvite : {
                role : 'super',
                params : [ 'nick' ],
                handler : function(dao, dbuser, params){
                    dao.findUser(params.nick).then(function(dbuser){
                        if(dbuser){
                            var nick = dbuser.get('nick');
                            dao.getChannelInfo(channelName).then(function(info){
                                whitelist = JSON.parse(info.whitelist);
                                if(whitelist[nick]){
                                    delete whitelist[nick];
                                    dao.setChannelInfo(channelName, 'whitelist', JSON.stringify(whitelist)).then(function(info){
                                        showMessage(nick + ' has been uninvited.')
                                    });
                                    indexOf(nick) != -1 && socketEmit(channel.online[indexOf(nick)].socket,'refresh');
                                } else {
                                    errorMessage('User wasn\'t invited')
                                }
                            });
                        }
                    });
                }
            },
            whitelist : {
                role : 'admin',
                handler : function(dao, dbuser, params){
                    dao.getChannelInfo(channelName).then(function(info){
                        if(info.whitelist){
                            whitelist = JSON.parse(info.whitelist);
                            showMessage(JSON.stringify(Object.keys(whitelist)));
                        } else {
                            showMessage('Nobody whitelisted on this channel');
                        }
                    });
                }
            },
            play : {
                role : 'super',
                params : [ 'url' ],
                handler : function(dao, dbuser, params) {
                    roomEmit('playvid', {
                        url : params.url
                    });
                }
            },
            msg : {
                params : [ 'message' ],
                handler : function(dao, dbuser, params) {
                    var message = params.message.substring(0, 50)
                    roomEmit('centermsg', {
                        msg : message
                    });
                }
            },
            mask : {
                params : [ 'vHost' ],
                handler : function(dao, dbuser, params) {
                    dao.findvHost(params.vHost).then(function(host){
                        if(!host){
                            dbuser.set('vHost', params.vHost).then(function() {
                                socketEmit(socket, 'update', {
                                    mask : params.vHost
                                });
                            });
                        } else {
                            errorMessage(msgs.get('vhosttaken', params.vHost));
                        }
                    });
                }
            },
            ghost : {
                role : 'super',
                handler : function(dao, dbuser, params) {
                    for (i = 0; i < channel.online.length; i++) { 
                        channel.online[i].socket.emit('alive')
                    }
                    setTimeout(function(){
                        for (i = 0; i < channel.online.length; i++) {
                            if(!channel.online[i].alive){
                                roomEmit('left', {
                                    id : channel.online[i].socket.id,
                                    nick : channel.online[i].nick,
                                    part : 'i\'m a spooky ghost!'
                                });
                                channel.online.splice(to, 1);
                                channel.online[i].socket.disconnect();
                                showMessage(channel.online[i].nick + ' was a ghost!');
                            } else {
                                showMessage(channel.online[i].nick + ' isn\'t a ghost.');
                            }
                        }
                    },1000);
                }
            },
            global : {
                role : 'super',
                params : [ 'message' ],
                handler : function(dao, dbuser, params) {
                    broadcast(dao, params.message)
                }
            },
            lock : {
                params : [ 'command', 'role' ],
                handler : function(dao, dbuser, params) {
                    var cmd = COMMANDS[params.command];
                    if(cmd){
                        command_access[params.command] = [params.role,params.access_level]
                        showMessage(params.command + ' is now locked for ' + params.role + ' ' + params.access_level + ' and up')
                    } else {
                        errorMessage(params.command + ' isn\'t a command');
                    }
                }
            },
            frame : {
                role : 'super',
                params : [ 'url' ],
                handler : function(dao, dbuser, params) {
                    dao.setChannelInfo(channelName, 'frame_src', params.url).then(function() {
                        roomEmit('update', {
                            frame_src : params.url
                        });
                    });
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
                user.tabs = 0
                if(channel.online.length > 0){
                    for (i = 0; i < channel.online.length; i++) { 
                        if(channel.online[i].remote_addr == user.remote_addr){
                            user.tabs++
                        }
                    }
                }//&& user.tabs < 3
                if (!user.nick) {
                    return dao.getChannelInfo(channelName).then(function(data){
                        var nick = msg && msg.nick;
                        var token = msg && msg.security;
                        var permit = 0;
                        var whitelist = [nick];
                        if(data['whitelist']){
                            whitelist = JSON.parse(data['whitelist']);
                        }
                        if (nick) {
                            var done = $.Deferred();
                            var nick = msg && msg.nick.slice(0,100);
                              dao.isBanned(channelName, nick, user.remote_addr, user.vhost).then(function(isbanned) {
                                if (isbanned) {
                                    log.debug('Join request, but user is banned');
                                    errorMessage(msgs.banned);
                                    socket.disconnect();
                                } else {
                                    if(data['private'] == 1){
                                        ips = [];
                                        for(var key in whitelist) {
                                            ips.push(whitelist[key].remote_addr);
                                        }
                                        if(ips.indexOf(user.remote_addr) != -1){
                                            attemptNick(dao, nick, undefined, token).then(function() {
                                                done.resolve.apply(done, arguments);
                                            }, function(err) {
                                                done.reject(err);
                                            }); 
                                        }else{
                                            errorMessage('Channel is private.');
                                            socket.disconnect()
                                        }
                                    } else {
                                        attemptNick(dao, nick, undefined, token).then(function() {
                                            done.resolve.apply(done, arguments);
                                        }, function(err) {
                                            done.reject(err);
                                        });
                                    }
                                }
                              });
                            return done.promise();
                        } else {
                            if(data['private'] == 1){
                                for (i = 0; i < whitelist.length; i++) {
                                    dao.findUser(whitelist[i]).then(function(dbuser){
                                        if(user.remote_addr == dbuser.get('remote_addr')){
                                            permit = 1
                                        };
                                        if(i == whitelist.length && permit){
                                            return attemptNick(dao);
                                        } else {
                                            errorMessage('Channel is private.')
                                            socket.disconnect();
                                        }
                                    });
                                };
                            } else {
                                return attemptNick(dao);
                            }
                        };
                    });
                } else {
                    errorMessage("Too many tabs open!");
                    log.debug('Join request, but user already online');
                    return $.Deferred().resolve(false).promise();
                }
            },
            message : function(dao, msg) {
                var done = $.Deferred();
                var id;
                if (user.nick) {
                    var hat = Math.random() < 0.0001 ? 'Gold' : Math.random() < 0.001 ? 'Coin' : 'nohat';
                    var message = msg && msg.message;
                    if (typeof message == 'string') {
                        dao.findUser(user.nick).done(function(dbuser) {
                            if (user.role != 'mute') {
                                count++;
                                roomEmit('message', {
                                    type : 'chat-message',
                                    nick : user.nick,
                                    flair : typeof msg.flair == 'string' ? msg.flair.substring(0, settings.limits.message) : '',
                                    message : message.substring(0, settings.limits.message),
                                    hat : hat,
                                    count : count
                                });
                            } else {
                                socketEmit(user.socket, 'update', {
                                    idle : 1
                                });
                                socketEmit(user.socket, 'message', {
                                    type : 'chat-message',
                                    nick : dbuser.get('nick'),
                                    flair : typeof msg.flair == 'string' ? msg.flair.substring(0, settings.limits.message) : '',
                                    message : message.substring(0, settings.limits.message),
                                    hat : hat
                                });
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
            command : function(dao, msg) {
                var err;
                if (user.nick && user.role != 'mute' || user.pend) {
                    var cmd = COMMANDS[msg && msg.name];
                    if (cmd) {
                        var params = msg.params;
                        for (var x in params){
                            params[x] = params[x].replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                        }
                        var valid = true;
                        if (cmd.params) {
                            valid = !_.any(cmd.params, function(param) {
                                return typeof params[param] != 'string' || !params[param];
                            });
                        }
                        if (valid) {
                            if(msg.name == 'login' && user.pend){
                                return cmd.handler(dao, null, params);
                            }
                            return dao.findUser(user.nick).then(function(dbuser) {
                                if(roles.indexOf(user.role) >= 0){
                                    if(cmd.access_level == undefined){
                                        cmd.access_level = 3
                                    }
                                    if(roles.indexOf(user.role) <= roles.indexOf(cmd.role)){
                                        if(user.access_level <= cmd.access_level){
                                            valid = true
                                        }
                                    } else {
                                        if(roles.indexOf(cmd.role) != -1){
                                            valid = false
                                        } else {
                                            valid = true
                                        }
                                    }
                                    if (valid) {
                                        if(!command_access[msg.name] || roles.indexOf(command_access[msg.name][0]) > roles.indexOf(user.role)){
                                            return cmd.handler(dao, dbuser, params) || $.Deferred().resolve(true);
                                        } else {
                                            if(command_access[msg.name][1] >= user.access_level && roles.indexOf(command_access[msg.name][0]) > roles.indexOf(user.role)){
                                                return cmd.handler(dao, dbuser, params) || $.Deferred().resolve(true);
                                            } else {
                                                return $.Deferred().resolve(false, msgs.invalidCommandAccess + ' (Locked)');
                                            }
                                        }
                                        console.log(user.nick + ' - ' + msg.name + ' - ' + user.role, params);
                                    } else {
                                        return $.Deferred().resolve(false, msgs.invalidCommandAccess);
                                    }
                                } else {
                                    errorMessage('ERROR');
                                    console.log('ERROR-ROLE-1')
                                    user.role = 'basic'
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
            },
        passgood : function(dao, msg){
            var done = $.Deferred();
            if (msg.data) {
            var url = "https://www.google.com/recaptcha/api/siteverify";
            request.post(
                url,
                { form : { secret : settings.api.recaptcha,
			    response : msg.data.substring(21) } },
                function (error, response, body) {
                    if (!error){
                        if (JSON.parse(body).success){
                            socketEmit(socket,'removeDiv');
                            dao.findUser(user.nick).then(function(dbuser){
                                dbuser.verify(user.regpass,undefined).done(function(success, error) {
                                    chnl = dbuser.get('nick') + '.spooks.me/';
                                    access = {};
                                    whitelist = {};
                                    access[dbuser.get('nick')] = {"role":"admin","access_level":"0"};
                                    whitelist[dbuser.get('nick')] = {'remote_addr':dbuser.get('remote_addr')};
                                    return dao.setChannelInfo(chnl, 'access', JSON.stringify(access)).then(function(){
                                        if(success){
                                            user.login = true;
                                            socketEmit(socket, 'update', {
                                                login : true
                                            });
                                            showMessage('Verification successful')
                                        }
                                        delete user.regpass;
                                    });
                                    dao.setChannelInfo(chnl, 'whitelist', whitelist);
                                });
                            });
                        } else {
                            console.log("Captcha failed. User was not registered");
                            errorMessage("Captcha was not correct. Obviously.");
                            done.resolve(false);
                        }
                    } else {
                        console.log("An error occured while submitting data to Google");
                        done.resolve(false);
                    }
                }
            );
            } else {
                console.log("Invalid form data.");
                done.resolve(false);
            }
            return done.promise();
        }
           /* updateMousePosition : function(dao, position) {
                if (position && typeof position.x == 'number' && typeof position.y == 'number') {
                    otherEmit('updateMousePosition', {
                        id : socket.id,
                        position : {
                            x : position.x,
                            y : position.y
                        }
                    });
                }
                return $.Deferred().resolve(true);
            }*/
        },
  
        /*
         * For each message wrap in a function which will check if the user is
         * banned or not.
         */
        function(fn, msg) {
            socket.on(msg, function() {
                var args = _.toArray(arguments);
                var banned_throttles = [];
                var throttleProps = settings.throttle[msg] || settings.throttle['default'];
                throttleProps.banned.limits.forEach(function(limit, i) {
                    banned_throttles.push(throttle.on(i + '-banned-' + socket.id, limit));
                });
                $.when.apply($, banned_throttles).done(function() {
                    var throttles = [];
                    throttles.push(throttle.on(msg + 'Global', throttleProps.global))
                    throttles.push(throttle.on(msg + '-' + channelName, throttleProps.channel));
                    throttles.push(throttle.on(msg + '-' + socket.id, throttleProps.user));
                    $.when.apply($, throttles).fail(function() {
                        if (throttleProps.errorMessage) {
                            errorMessage(msgs.throttled);
                        }
                    }).done(function() {
                        try {
                            log.debug('Received message: ', msg, args);
                            dao(function(dao) {
                                dao.isBanned(channelName, user.remote_addr, user.nick, user.vhost).done(function(banned) {
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
                    }, throttleProps.banned.unban);
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
         * @inner
         */
        function otherEmit() {
            log.debug('other emit', JSON.stringify(_.toArray(arguments)));
            socket.broadcast.emit.apply(socket.broadcast, arguments);
        }

        /**
         * @param {boolean} success
         * @param {string} message
         */
        function handleResponse(success, message) {
            if (message) {
            	showMessage(message, success ? '' : 'error-message')
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
                type : type || 'system-message',
                message : message
            });
        }

        function broadcast(dao, message) {
            for(var key in channels){
                broadcastChannel(dao, channels[key], message)
            }
        }

        function broadcastChannel(dao, channel, message) {
       	    count++;
            channel.online.forEach(function(user){
                dao.findUser(user.nick).done(function(dbuser) {
                    socketEmit(user.socket,'updateCount',{
                    	count : count	
                    });
                    socketEmit(user.socket, 'message', {
                        type : 'general-message',
                        message : message
                    });
                })
            })
        }

        /**
         * @inner
         * @param {string} nick
         * @returns {number}
         */
        function indexOf(nick) {
            if(nick){
                for ( var i = 0; i < channel.online.length; i++) {
                    if (channel.online[i].nick.toLowerCase() == nick.toLowerCase()) {
                        return i;
                    }
                }
            }
            return -1;
        }
        
        /**
         *
         * Get Users info
         *
         */
        
        function GetInfo(nick) {
            if(!access[nick]){
                return {
                    "role":'basic',
                    "access_level":3
                }
            } else {
                return {
                    "role":access[nick].role,
                    "access_level":access[nick].access_level
                }
            }
        }
        
        /**
         *
         * Get users accesses
         *
         */
        
        function grab(nick){
            t = indexOf(nick);
            if(t != -1){
                return channel.online[t]
            } else{
                return t;
            }
        }
        
        /**
         * @inner
         * @param {Object} dao
         * @param {string=} nick
         * @param {string=} password
         * @returns {$.Deferred}
         */
        function attemptNick(dao, nick, password, token) {
            var done = $.Deferred();
            
            /**
             * make sure name is valid
             */
            
            
            
            function ValidName(name) {
                //[^\x00-z]/.test(name)
                var temp = 0,invalid = 0;
                for (var i = 0; i <= name.length; i++) {
                    temp = name.charCodeAt(i);
                    if (temp > 122) {
                        invalid = 1
                    } 
                    if(i == name.length) {
                        if(invalid){
                            return false
                        } else {
                            return true
                        }
                    }
                }
            }
            
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
            function attempt(nick, password, dbuser, token) {
                if (indexOf(nick) >= 0 && password) {
                    var osock = channel.online[indexOf(nick)].socket;
                    socketEmit(osock, 'message', {
                        type : 'error-message',
                        message : msgs.ghosted
                    });
                    osock.disconnect();
                }
                if (indexOf(nick) >= 0) {
                    log.debug('Attempted to nick to ', nick, ' but someone else is using that nick right now');
                    if (user.nick) {
                        done.resolve(false, msgs.alreadyBeingUsed);
                    } else {
                        fallback();
                    }
                } else {
                    var online = !!user.nick;
                    var stats = {};
                    user.nick = nick;
                    user.login = false;
                    dao.getChannelInfo(channelName).then(function(data){
                        if(!data.access){
                            data.access = '{}'
                            dao.setChannelInfo(channelName, 'access', data.access)
                        }
                        access = JSON.parse(data.access);
                        stats = GetInfo(user.nick);
                        if(dbuser){
                            var hashToken = hasher.hex_md5(hasher.genRandomSeed(6));
                            var currentDate = new Date();
                            currentDate = currentDate.getTime();
                            if (tokenCache[user.nick]) {
                                var subCache = tokenCache[user.nick];
                                if (subCache.token3 && subCache.token3 == token){
                                    tokenCache[user.nick].token3 = hashToken;
                                    tokenCache[user.nick].date3 = currentDate;
                                } else if (subCache.token2 && subCache.token2 == token){
                                    tokenCache[user.nick].token2 = hashToken;
                                    tokenCache[user.nick].date2 = currentDate;
                                } else {
                                    tokenCache[user.nick].token = hashToken;
                                    tokenCache[user.nick].date = currentDate;
                                }
                            } else {
                                tokenCache[user.nick] = {
                                    token : hashToken,
                                    date : currentDate
                                }
                            }
                            if(roles.indexOf(dbuser.get('role')) <= 1){
                                user.role = dbuser.get('role')
                                user.access_level = dbuser.get('access_level')
                            } else {
                                user.role = stats.role;
                                user.access_level = stats.access_level
                            }
                            dbuser.set('remote_addr', user.remote_addr);
                            user.vhost = dbuser.get('vHost')
                            user.login = true;
                            console.log(user.nick + ' joined with ' + user.role + ' - ' + user.access_level)
                        } else {
                            user.vhost = user.remote_addr;
                            user.role = 'basic';
                            user.access_level = 3;
                        }
                        socketEmit(socket, 'update', {
                            id : socket.id,
                            nick : user.nick,
                            access_level : user.access_level.toString(),
                            role : user.role,
                            vHost : user.vhost,
                            security : hashToken,
                            login : user.login
                        });
                        if (online && indexOf(user.nick) != -1) {
                      	    count++;
                      	    roomEmit('updateCount',{
                            	count : count
                            });
                            roomEmit('nick', {
                                id : socket.id,
                                nick : user.nick
                            });
                        } else {
                            channel.online.push(user);
                            log.debug('Successful join!');
                            count++;
                            roomEmit('updateCount',{
                            	count : count
                            });
                            roomEmit('join', {
                                id : socket.id,
                                nick : user.nick
                            });
                        }
                        done.resolve(true);
                    });
                }
            }

            if (nick && typeof nick == 'string') {
                if(ValidName(nick)) {
                    dao.findUser(nick).then(function(dbuser) {
                        if (dbuser) {
                            if (dbuser.get('verified')) {
                                if (password) {
                                    if (dbuser.verifyPassword(password)) {
                                        log.debug('Nick password was correct');
                                        attempt(nick, password, dbuser);
                                    } else {
                                        log.debug('Nick password was incorrect');
                                        if (user.nick) {
                                            done.resolve(false, msgs.invalidLogin);
                                        } else {
                                            fallback();
                                        }
                                    }
                                } else if (token) {
                                    if (tokenCache[nick]) {
                                        var tokenDate;
                                        if (token == tokenCache[nick]['token']){
                                            tokenDate = tokenCache[nick]['date'];
                                        } else if (token == tokenCache[nick]['token2']){
                                            tokenDate = tokenCache[nick]['date2'];
                                        } else if (token == tokenCache[nick]['token3']){
                                            tokenDate = tokenCache[nick]['date3'];
                                        } else {
                                            console.log('Token was incorrect.');
                                            fallback();
                                        }
                                        var presentDate = new Date();
                                        if (tokenDate && tokenDate+604800000 > presentDate.getTime()){
                                            log.debug('Token accepted.');
                                            attempt(nick, undefined, dbuser, token);
                                        } else {
                                            log.debug('Token was expired for '+nick+'.');
                                            fallback();
                                        }
                                    } else {
                                        console.log('Token not stored on server!');
                                        fallback();
                                    }
                                } else if (user.nick) {
                                    done.resolve(false, msgs.nickVerified);
                                } else {
                                    fallback();
                                }
                            } else {
                                log.debug('Nick was not registered');
                                attempt(nick);
                            }
                        } else {
                            log.debug('Nick ', nick, ' does not exist, nicking to a new nick');
                            attempt(nick);
                        }
                    }, function(err) {
                        done.reject(err);
                    });
                } else {
                    done.resolve(false, msgs.InvalidCharacters);
                }
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

    return channel;
}

function initApp(app, server, https) {
    if (settings.server.compression) {
        app.use(require('compression')());
    }
    app.use(express.static(__dirname + '/public', settings.server.cache ? {
        maxAge : settings.server.cache
    } : undefined));
    var io = require('socket.io')(server);
    channels = {};
    var channelRegex = /^\/(\w*\/?)$/;
    app.get(channelRegex, function(req, res) {
        var domain = /^([^:]+)(?::\d+|)$/.exec(req.get('host'))[1];
        var httpsDomain = settings.https && settings.https.domain;
        var allHttps = !httpsDomain && settings.https && !https;
        var onHttpDomain = httpsDomain && https != (httpsDomain == domain);
        if (false) {
            console.log('redirect', allHttps, onHttpDomain);
            if (https) {
                var port = httpsPort == 80 ? '' : ':' + httpPort;
                res.redirect('http://' + domain + port + req.url);
            } else {
                var port = httpsPort == 443 ? '' : ':' + httpsPort;
                res.redirect('https://' + domain + port + req.url);
            }
        } else {
            try {
                var host = req.headers.host;
                var channelName = channelRegex.exec(req.url)[1];
                if (host != 'spooks.me') {
                    channelName = host + '/' + channelName;
                }
                if (!channels[channelName]) {
                    channels[channelName] = createChannel(io, channelName);
                }
                
                //channel redirects
                
                if(channelName == 'b'){
                    res.redirect("http://anon.spooks.me/");
                } else if(channelName == 'b/'){
                    res.redirect("http://anon.spooks.me/");
                }
                
                var index = fs.readFileSync('index.html').toString();
                _.each({
                    channel : channelName
                }, function(value, key) {
                    index = index.replace('${' + key + '}', value);
                });
                res.send(index);
            } catch (err) {
                console.error(err);
            }
        }
    });
}

(function() {
    var httpApp = express();
    var httpServer = require('http').Server(httpApp);

    if (settings.https) {
        var httpsApp = express();
        var httpsServer = require('https').createServer({
            key : fs.readFileSync(settings.https.key),
            cert : fs.readFileSync(settings.https.cert)
        }, httpsApp);
        initApp(httpsApp, httpsServer, true);
        httpsServer.listen(httpsPort, function() {
            console.log('https listening on *:' + httpsPort);
        });
    }

    initApp(httpApp, httpServer, false);
    httpServer.listen(httpPort, function() {
        console.log('http listening on *:' + httpPort);
    });
})();
