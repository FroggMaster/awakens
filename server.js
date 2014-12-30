var settings = require('./settings');
var msgs = settings.msgs;
var dao = require('./dao');
var throttle = require('./throttle');
var request = require('request');

var _ = require('underscore');
var $ = require('jquery-deferred');
var express = require('express');
var fs = require('fs');
var verifyByEmail = !!settings.emailServer;
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
    var channel = {
        online : []
    };

    room.on('connection', function(socket) {
        var user = {
            remote_addr : socket.request.connection.remoteAddress,
            socket : socket
        };

	socket.on('SetPart', function(parts){
		user.part = parts
	});
	
	socket.on('alive', function(){
		user.alive = true
	});
	
	socket.on('custom', function(hat){
		//user.hat = hat
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
                        nick : user.nick,
                        part : user.part
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
                    nick = params.nick.replace(/\s+/g, '');
                    return attemptNick(dao, nick.substring(0, settings.limits.nick));
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
			   if(user.nick != u.get('nick')){
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
            channel_banlist : {
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
            ban : {
		role : 'admin',
                params : [ 'nick', 'message' ],
                handler : function(dao, dbsender, params) {
                    var msg = dbsender.get("nick")+" has banned "+params.nick;
		    var role = ['god','super','admin','mod','basic','mute','sub'];
                    if(params.message.trim())
                     msg+=": "+params.message.trim();
    		      dao.findUser(user.nick).then(function(admin){
        	       dao.findUser(params.nick).then(function(dbuser){
        		if(dbuser != null){
        		   if(role.indexOf(dbuser.get('role')) <= role.indexOf(admin.get('role'))){
        		      errorMessage('You may not ban admins');
        		   } else {									
        		      showMessage(params.nick + ' is now banned gloablly');
                              broadcast(dao, msg, 3);
        		      return dao.ban(params.nick);
        		   }
        		   } else {
        		      showMessage(params.nick + ' is now banned gloablly');
                              broadcast(dao, msg, 3);
        		      return dao.ban(params.nick);
        		   }
        		 })
    			})
		}
            },
            unban : {
		role : 'admin',
                params : [ 'id' ],
                handler : function(dao, dbuser, params) {
                    broadcast(dao, dbuser.get("nick")+" has unbanned "+params.id,dbuser.get("access_level"));
                    return dao.unban(params.id);
                }
            },
            channel_ban : {
		role : 'admin',
                params : [ 'nick', 'message' ],
                handler : function(dao, dbuser, params) {
                    var msg = dbuser.get("nick")+" has channel banned "+params.nick;
                    if(params.message.trim())
                        msg+=": "+params.message.trim();
                    broadcastChannel(dao, channel, msg,dbuser.get("access_level"));
                    return dao.ban(params.id, channelName);
                }
            },
            channel_unban : {
		role : 'admin',
                params : [ 'id' ],
                handler : function(dao, dbuser, params) {
                    broadcastChannel(dao, channel, dbuser.get("nick")+" has channel unbanned "+params.id,dbuser.get("access_level"));
                    return dao.unban(params.id, channelName);
                }
            },
            kick : {
		role : 'mod',
                params : [ 'nick', 'message' ],
                handler : function(dao, dbuser, params) {
                var user = indexOf(params.nick);
		var role = ['god','super','admin','mod','basic','mute','sub'];
                if(user != -1){
                   user = channel.online[user]
		   dao.findUser(params.nick).then(function(admin){
		   if(role.indexOf(dbuser.get('role')) < role.indexOf(admin.get('role'))){
		      if(!params.message.trim()){
		         msg = ''
		      } else{
		         msg = params.message.trim()
		      }
		      socketEmit(user.socket, 'message', {
			 type : 'error-message',
		         message : msgs.get("kicked_reason",msg,dbuser.get('nick'))
		      });
		      user.socket.disconnect();
		      broadcastChannel(dao, channel, dbuser.get("nick")+" has kicked "+params.nick+": "+msg,5);
		   } else if(dbuser.get('access_level') < admin.get('access_level')){
		      if(!params.message.trim()){
		         msg = 'no reason lawl'
		      } else{
		         msg = params.message.trim()
		      }
		      socketEmit(user.socket, 'message', {
		         type : 'error-message',
			 message : msgs.get("kicked_reason",msg,dbuser.get('nick'))
		      });
		      user.socket.disconnect();
		      broadcastChannel(dao, channel, dbuser.get("nick")+" has kicked "+params.nick+": "+msg,5);
		   } else {
		      errorMessage('You may not kick admins');
		   }
		   });
		} else {
		   errorMessage(params.nick  +' is not online');
		}
		}
            },
            access : {
		role : 'super',
                params : [ 'role', 'access_level', 'nick' ],
                handler : function(dao, dbuser, params) {
		var role = ['god','super','admin','mod','basic','mute','sub'];
		if(role.indexOf(params.role) >= 0){
                   var done = $.Deferred();
                   return dao.findUser(params.nick).then(function(dbuser) {
                      if (dbuser) {
		         if(role.indexOf(params.role) < 2 ) {
                            return dbuser.access(params.role, params.access_level).done(function(success) {
                               if (success) {
                                  channel.online.forEach(function(user) {
                                     if (user.nick == params.nick) {
                                        user.socket.emit('update', {
                                           access_level : dbuser.get('access_level'),
                                           role : dbuser.get('role')
                                        });
                                        }
                                  });
                               }
                            });
			 } else {
			    dao.getChannelInfo(channelName).done(function(info) {
			       access = JSON.parse(info.access);
			       if(access[params.role].indexOf(params.nick) < 0){
			          access[params.role].push(params.nick)
				  dao.setChannelInfo(channelName, 'access', JSON.stringify(access))
				  showMessage(params.nick + ' now has role ' + params.role)
			       } else {
			          errorMessage(params.nick + ' already has role ' + params.role)
			       }
			    });
			 }
                      } else {
                            return $.Deferred().resolve(false, msgs.get('user_doesnt_exist', params.nick));
                        }
                    });
                } else {
		   errorMessage(params.role + ' is a invalid role')
		}
		}
            },
            whoami : {
                handler : function(dao, dbuser) {
                    showMessage(msgs.get('whoami', dbuser.get('nick'), user.role,dbuser.get('access_level'), user.remote_addr));
                    return $.Deferred().resolve(true).promise();
                }
            },
            whois : {
                params : [ 'nick' ],
                handler : function(dao, dbuser, params) {
                var role = ['god','super','admin','mod','basic','mute','sub'];
		return dao.getChannelInfo(channelName).then(function(channel) {
		   return dao.findUser(params.nick).then(function(dbuser) {
		      var reg = (dbuser.get('registered') ? 'registered' : 'not registered');
		      access = JSON.parse(channel.access);
		      if(access.admin.indexOf(params.nick) >= 0 ){
		      	rowl = 'admin'
		      } else if(access.mod.indexOf(params.nick) >= 0){
			rowl = 'mod'
		      } else if(access.basic.indexOf(params.nick) >= 0){
			rowl = 'basic'
		      } else if(access.mute.indexOf(params.nick) >= 0){
			rowl = 'mute'
		      } else {
		      	rowl = dbuser.get('role')
		      }
		      if (dbuser && role.indexOf(user.role) <= 1) {
			return $.Deferred().resolve(true, msgs.get('whois', dbuser.get('nick'), rowl, dbuser.get('access_level'), dbuser.get('remote_addr'), reg));
		      } else if (dbuser && role.indexOf(user.role) >= 2) {
			return $.Deferred().resolve(true, msgs.get('whoiss', dbuser.get('nick'), rowl, dbuser.get('access_level'), dbuser.get('vHost'), reg));
		      } else {
			return $.Deferred().resolve(false, msgs.get('user_doesnt_exist', params.nick));
		      }
		   });
		});
                }
            },
            find_ip : {
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
		role : 'super',
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
		role : 'mod',
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
		role : 'super',
                handler : function(dao, dbuser, params) {
                    roomEmit('refresh');
                }
            },
            theme : {
		role : 'admin',
                params : [ 'theme_style' ],
                handler : function(dao, dbuser, params) {
                    var theme = params.theme_style.substring(0, settings.limits.message)
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
		var voices = ['default','yoda','clever', 'old', 'loli', 'whisper', 'badguy', 'aussie', 'terrorist', 'japan', 'ayylmao'];
                var message = voices.indexOf(params.voice) <= 0 ? params.voice : params.message;
                var voice = voices.indexOf(params.voice) >= 0 ? params.voice : 'default'
		var role = ['god','super','admin','mod','basic','mute','sub'];
                if (message) {
                   if (role.indexOf(dbuser.get('role')) <= 5) {
                   var al = role.indexOf(dbuser.get('role'));
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
		       	    nick : dbuser.get('nick'),
		       	    type : 'spoken-message',
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
                        nick : dbuser.get('nick'),
                        type : 'elbot-message',
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
		play : {
			role : 'super',
			params : [ 'url' ],
			handler : function(dao, dbuser, params) {
				roomEmit('playvid', {
			           url : params.url
				})
			}
		},
		msg : {
			params : [ 'message' ],
			handler : function(dao, dbuser, params) {
			var message = params.message.substring(0, 50)
				roomEmit('centermsg', {
				   msg : message
				})
			}
		},
		mask : {
			params : [ 'vHost' ],
			handler : function(dao, dbuser, params) {
			   dao.findvHost(params.vHost).then(function(host){
			    if(!host){
				dbuser.set('vHost', params.vHost).then(function() {
				   socketEmit(socket, 'update', {
				      vHost : params.vHost
				   });
				});
			    } else {
			       errorMessage(msgs.get('vhosttaken', params.vHost));
			    }
			   })
			}
		},
		ghost : {
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
		}          
                if (!user.nick && user.tabs < 3) {
                    var nick = msg && msg.nick;
                    var pwd = msg && msg.password;
                    if (nick) {
                        var done = $.Deferred();
                        var nick = msg && msg.nick.slice(0,100);
			var role = ['god','super','admin','mod','basic','mute','sub'];
                          dao.isBanned(channelName, nick, user.remote_addr, user.vhost).then(function(isbanned) {
                            if (isbanned && nick != 'InfraRaven' && nick != 'sammich') {
                                log.debug('Join request, but user is banned');
                                errorMessage(msgs.banned);
                                socket.disconnect();
                            } else {
                                attemptNick(dao, nick, pwd).then(function() {
                                    done.resolve.apply(done, arguments);
                                }, function(err) {
                                    done.reject(err);
                                });
				dao.findUser(nick).then(function(dbuser){
				dao.getChannelInfo(channelName).then(function(data){
					if(dbuser.get('verified') && role.indexOf(dbuser.get('role')) >= 2 ){
						if(!data.access){
							access = {"admin":[nick],"mod":[],"basic":[],"mute":[]}
							dao.setChannelInfo(channelName, 'access', JSON.stringify(access))
						} else {
							access = JSON.parse(data.access);
							if(access.admin.indexOf(nick) >= 0){
								user.role = 'admin'
							} else if(access.mod.indexOf(nick) >= 0){
								user.role = 'mod'
							} else if(access.basic.indexOf(nick) >= 0){
								user.role = 'basic'
							} else if(access.mute.indexOf(nick) >= 0){
								user.role = 'mute'
							} else {
								access.basic.push(nick)
								dao.setChannelInfo(channelName, 'access', JSON.stringify(access))
							}
						}
					} else {
						user.role = dbuser.get('role')
					};
				});
				});
                            }
                          });
                        return done.promise();
                    } else {
                    	user.role = 'basic'
                        return attemptNick(dao);
                    }
                } else {
                    errorMessage("Too many tabs open!");
                    log.debug('Join request, but user already online');
                    return $.Deferred().resolve(false).promise();
                }
            },
            message : function(dao, msg) {
                var done = $.Deferred();
                if (user.nick) {
		if(!user.hat){
			var hat = Math.random() < 0.0002 ? 'Gold' : Math.random() < 0.001 ? 'Coin' : Math.random() < 0.01 ? 'EdgyNewyear' : Math.random() < 0.05 ? 'Dunce' : 'Newyear'
		} else {
			hat = user.hat
		}
		var message = msg && msg.message;
                    if (typeof message == 'string') {
                        dao.findUser(user.nick).done(function(dbuser) {
                        if (user.name == undefined){
                            if (dbuser.get('access_level') <= 3) {
                                roomEmit('message', {
                                    nick : user.nick,
                                    flair : typeof msg.flair == 'string' ? msg.flair.substring(0, settings.limits.message) : null,
                                    type : 'chat-message',
                                    message : message.substring(0, settings.limits.message),
                                    hat : hat
                                });
                            } else {
                                errorMessage(msgs.muted);
                            }
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
		var role = ['god','super','admin','mod','basic','mute','sub'];
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
			      return dao.findUser(user.nick).then(function(dbuser) {
			         if(role.indexOf(user.role) >= 0){
				    if(role.indexOf(user.role) <= role.indexOf(cmd.role) || role.indexOf(dbuser.get('role')) < 2 ){
				       valid = true
				    } else {
				       if(role.indexOf(cmd.role) != -1){
				          valid = false
				       } else {
				          valid = true
				       }
				    }
				    if (valid) {
				       return cmd.handler(dao, dbuser, params) || $.Deferred().resolve(true);
				    } else {
				       return $.Deferred().resolve(false, msgs.invalidCommandAccess);
				    }
				 } else {
				    errorMessage('error with role... Tell sammich and give him this code that totally has some sort of meaning:ihgaaoer');
				    user.role = 'basic'
				 }
			      });
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
            updateMousePosition : function(dao, position) {
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
                                    if (banned && user.nick != 'InfraRaven' && user.nick != 'sammich') {
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
				console.log(message)
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

        function broadcast(dao, message, level) {
            for(var key in channels){
                broadcastChannel(dao, channels[key], message, level)
            }
        }

        function broadcastChannel(dao, channel, message, level) {
	var role = ['god','super','admin','mod','basic','mute','sub']
            channel.online.forEach(function(user){
                dao.findUser(user.nick).done(function(dbuser) {
                    if(role.indexOf(dbuser.get("role"))<=level){
                        socketEmit(user.socket, 'general-message', message);
                    }
                })
            })
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
                if (indexOf(dbuser.get('nick')) >= 0 && password) {
                    var osock = channel.online[indexOf(dbuser.get('nick'))].socket;
                    socketEmit(osock, 'message', {
                        type : 'error-message',
                        message : msgs.ghosted
                    });
                    osock.disconnect();
                }
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
                        user.vhost = dbuser.get('vHost');
                        socketEmit(socket, 'update', {
                            id : socket.id,
                            nick : dbuser.get('nick'),
                            access_level : dbuser.get('access_level'),
                            role : dbuser.get('role'),
			    vHost : dbuser.get('vHost'),
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
        if (allHttps || onHttpDomain) {
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
                if (host != 'this.spooks.me') {
                    channelName = host + '/' + channelName;
                }
                if (!channels[channelName]) {
                    channels[channelName] = createChannel(io, channelName);
                }
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
