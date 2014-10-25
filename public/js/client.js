var DATE_FORMAT = 'shortTime';
var BLACKLIST = [ 'wrdp.info', 'puu.sh' ];
var HighlightName;
var block = [];

// ------------------------------------------------------------------
// Client
// ------------------------------------------------------------------

ONLINE = new Backbone.Collection();

$(function() {
    var socket = io('/' + window.channel);
    var first = true;
    var requestId = 0;
    var requests = {};

    Game.init(socket);

    socket.on('join', function(user) {
        ONLINE.add(user);
        HighlightName = CLIENT.get('nick')
        CLIENT.show({
            type : 'general-message',
            message : user.nick + ' has joined'
        });
	
	if(CLIENT.get('part') != undefined){
		socket.emit('SetPart', CLIENT.get('part'));
	}
    });

    socket.on('general-message', function(message) {
        CLIENT.show({
            type : 'general-message',
            message : message
        });
    });

    socket.on('online', function(users) {
        ONLINE.add(users);
    });

    socket.on('left', function(user) {
        ONLINE.remove(user.id);
		if(user.part == undefined){
		CLIENT.show({
		    type : 'general-message',
            message : user.nick + ' has left'
		});
		} else {
        CLIENT.show({
            type : 'general-message',
            message : user.nick + ' has left ' + user.part
        });
		}
    });

    socket.on('nick', function(info) {
        var user = ONLINE.get(info.id);
        var old = user.get('nick');
        user.set('nick', info.nick);
        CLIENT.show({
            type : 'general-message',
            message : old + ' is now known as ' + info.nick
        });
    });

    socket.on('c_nick', function(info) {
        
		CLIENT.show({
        type : 'general-message',
        message : info.id + ' is now known as ' + info.nick
        });
		if(info.id == CLIENT.get('nick')){
		CLIENT.name = info.nick
		socket.emit('update_nick', {
            nick : info.nick,
        });
		} else if (info.id == CLIENT.name){
		CLIENT.name = info.nick
		socket.emit('update_nick', {
            nick : info.nick,
        });
		}
		
    });

    socket.on('update', function(info) {
		if(info.theme_style != undefined){
			if(CLIENT.get('bg') == 'off'){
				CLIENT.set(info);
				CLIENT.set('old',info.theme_style)
			} else {
				CLIENT.set('old',info.theme_style);
			}
		} else {
		CLIENT.set(info);
		}
    });

    socket.on('message', function(msg) {
	if(block.indexOf(msg.nick) == -1){
		CLIENT.show(msg);
	}
    });
    
    socket.on('submessage', function(msg) {
	if(msg.role == 'sub'){
	CLIENT.show(msg);
	}
})

    socket.on('connect', function() {
        if (!first) {
            //window.location.reload();
        }
        socket.emit('join', {
            nick : CLIENT.get('nick'),
            password : CLIENT.get('password')
        });
        first = false;
    });

    socket.on('disconnect', function() {
        ONLINE.reset();
        CLIENT.show({
            message : 'Disconnected',
            type : 'error-message'
        });
    });

    socket.on('refresh', function() {
        window.location.reload();
    });

    socket.on('response', function(msg) {
        var def = msg && requests[msg.id];
        if (def && def.state() == 'pending') {
            requests[msg.id] = null;
            if (msg.error) {
                def.reject(msg.error);
            } else {
                def.resolve(msg.message);
            }
        }
    });

    socket.on('updateMousePosition', function(msg) {
        CLIENT.trigger('updateMousePosition', msg);
    });

    /**
     * @inner
     * @param {string} name
     * @param {string} input
     * @param {Array.<string>} expect
     */
    function parseParams(name, input, expect) {
        if (name == 'pm' || name == 'c_nick') {
            var pm = /^(.*?[^\\])\|([\s\S]*)$/.exec(input);
            if (pm) {
                var nick = pm[1].replace('\\|', '|');
                var message = pm[2];
                return {
                    nick : nick,
                    message : message,
		    c_nick : message
                };	
            }
        } else if(name == 'toggle'){
        	toggled(input)
        } else if(name == 'block'){
		blocked(input)
	} else if(name == 'unblock') {
		unblocked(input)
	} else if (name == 'kick' || name == "ban" || name == "channel_ban") {
            var pm = /^(.*?[^\\])(?:\|([\s\S]*))?$/.exec(input);
            if (pm) {
                var nick = pm[1].replace('\\|', '|');
                var message = pm[2]  || " ";
                return {
                    nick : nick,
                    message : message,
        	    c_nick : message
                };  
            }
        } else {
            var values = input.split(' ');
            if (values[0] == '') {
                values.shift();
            }
            var lastParam = _.last(expect);
            if (lastParam && /\$$/.test(lastParam) && values.length > expect.length) {
                var combine = values.splice(expect.length, values.length - expect.length).join(' ');
                values[expect.length - 1] += ' ' + combine;
            }
            if (values.length == expect.length) {
                var params = {};
                values.forEach(function(param, i) {
                    params[expect[i].replace('$', '')] = param;
                });
                return params;
            }
        }
        return null;
    }

    CLIENT = new (Backbone.Model.extend({
        initialize : function() {
            /* Initialize from localstorage. */
            'color font style mute mute_speak nick password images flair cursors marquee bg role part'.split(' ').forEach(function(key) {
                this.set(key, localStorage.getItem('chat-' + key));
                this.on('change:' + key, function(m, value) {
                    if (value) {
                        localStorage.setItem('chat-' + key, value);
                    } else {
                        localStorage.removeItem('chat-' + key);
                    }
                });
            }, this);

            /* Notify when values change. */
            'color font style flair mute mute_speak images cursors marquee bg role part'.split(' ').forEach(function(key) {
                this.on('change:' + key, function(m, value) {
                    if (value) {
                        this.show(key + ' changed to: ' + value);
                    } else {
                        this.show(key + ' reset to default');
                    }
                }, this);
            }, this);

            'color font style flair'.split(' ').forEach(function(key) {
                this.on('change:' + key, function(m, value) {
                    this.submit('/echo Now your messages look like this');
                }, this);
            }, this);

            'access_level'.split(' ').forEach(function(key) {
                var first = true;
                this.on('change:' + key, function(m, value) {
                    if (!first) {
                        this.show(key + ' changed to: ' + value);
                    }
                    first = false;
                }, this);
            }, this);
        },

        request : function(msg) {
            var id = requestId++;
            var result = requests[id] = $.Deferred();
            socket.emit('request', {
                id : id,
                msg : msg
            });
            return result.promise();
        },

        getAvailableCommands : function() {
	    var role = ['god','super','admin','mod','basic','mute','sub'];
            var myrole = this.get('role');
            return myrole == null ? [] : _.filter(_.keys(COMMANDS), function(key) {
                var cmd_level = COMMANDS[key].role;
                return cmd_level == null || role.indexOf(myrole) <= role.indexOf(cmd_level);
            });
        },

        submit : function(input) {
            var access_level = this.get('access_level');
            if (access_level >= 0) {
                var parsed = /^\/(\w+) ?([\s\S]*)/.exec(input);
                if (parsed) {
                    input = parsed[2];
                    var name = parsed[1].toLowerCase();
                    var cmd = COMMANDS[name];
                    if (cmd && access_level <= (cmd.access_level || 3)) {
                        var expect = cmd.params || [];
                        var params = parseParams(name, input, expect);
                        if (expect.length == 0 || params) {
                            var handler = typeof cmd == 'function' ? cmd : cmd.handler;
                            if (handler) {
                                handler(params);
                            } else {
                                socket.emit('command', {
                                    name : name,
                                    params : params
                                });
                            }
                        } else {
                            CLIENT.show({
                                message : 'Invalid: /' + name + ' <' + expect.join('> <').replace('$', '') + '>',
                                type : 'error-message'
                            });
                        }
                    } else {
                        CLIENT.show({
                            message : 'Invalid command. Expected: /' + this.getAvailableCommands().join(', /'),
                            type : 'error-message'
                        });
                    }
                } else {
                    input = this.decorate(input);
                    socket.emit('message', {
                        flair : CLIENT.get('flair'),
                        message : input
                    });
                }
            }
        },

        show : function(message) {
            this.trigger('message', message);
        },

        decorate : function(input) {
            if (input.charAt(0) != '>') {
                var style = this.get('style');
                var color = this.get('color');
                var font = this.get('font');
                if (style) {
                    input = style + input;
                }
                input = ' ' + input;
                if (color) {
                    input = '#' + color + input + ' ';
                }
                if (font) {
                    input = '$' + font + '|' + input;
                }
            }
            return input;
        },

        updateMousePosition : function(position) {
            socket.emit('updateMousePosition', position);
        }
    }));
});

// ------------------------------------------------------------------
// Topic
// ------------------------------------------------------------------

$(function() {
    var blurred = false;
    var unread = 0;
    function updateTitle() {
        var topic = CLIENT.get('topic');
        if (topic) {
            if (blurred && unread > 0) {
                document.title = '(' + unread + ') ' + topic.replace('\\n', '');
            } else {
                document.title = topic.replace('\\n', '');
            }
        }
    }
    $(window).blur(function() {
        blurred = true;
        unread = 0;
    });
    $(window).focus(function() {
        blurred = false;
        updateTitle();
    });
    CLIENT.on('message', function(message) {
        if (blurred) {
            unread++;
            updateTitle();
        }
    });
    CLIENT.on('change:notification', function(m, notification) {
        updateTitle();
        CLIENT.show({
            type : 'note-message',
            message : notification
        });
    });
    CLIENT.on('change:topic', function(m, topic) {
        updateTitle();
        CLIENT.show({
            type : 'general-message',
            message : 'Topic: ' + topic
        });
    });
	if (CLIENT.get('images') == null){
	  CLIENT.set('images', 'on'); 
	}
	if (CLIENT.get('bg') == null){
	CLIENT.set('bg', 'off'); 
	}
	if (CLIENT.get('marquee') == null){
	CLIENT.set('marquee', 'on'); 
	}
});

// ------------------------------------------------------------------
// Theme
// ------------------------------------------------------------------

$(function() {
    CLIENT.on('change:theme', function(m, theme) {
        if (theme) {
            $('body').attr("class", theme);
        } else {
            $('body').attr('class', '');
        }
    });
    CLIENT.on('change:theme_style', function(m, theme_style) {
        if (theme_style && theme_style != 'default') {
            $('#messages').css('background', theme_style);
        } else {
            $('#messages').css('background', '');
        }
    });
});

// ------------------------------------------------------------------
// Online User Tracking
// ------------------------------------------------------------------

$(function() {
    function updateCount() {
        $('#online-users .menu').text('Menu (' + ONLINE.size() + ')');
    }
    ONLINE.on('add', function(user) {
        var li = $('<li></li>').attr({
            id : 'online-' + user.get('id')
        }).appendTo('#online');
        var nick = $('<span></span>').text(user.get('nick')).appendTo(li);
        li.append(' ');
        $('<a class="pm_user">pm</a>').appendTo(li).click(function() {
            $('#input-message').focus().val('').val('/pm ' + user.get('nick') + '|');
        });
        user.on('change:nick', function() {
            nick.text(user.get('nick'));
        });
        updateCount();
    });
    ONLINE.on('remove', function(user) {
        $('#online-' + user.get('id')).remove();
        updateCount();
    });
    ONLINE.on('reset', function() {
        $('#online').html('');
    });
});

// ------------------------------------------------------------------
// Messages
// ------------------------------------------------------------------

$(function() {
    var animation = null;

    CLIENT.on('message', function(message) {
        if (typeof message == 'string') {
            message = {
                message : message
            };
        }
        message.type = message.type || 'system-message';
        var el = buildMessage(message);
        switch (message.type) {
        /*
         * case 'personal-message': PM.show(message, el); break;
         */
        default:
            appendMessage(el);
            break;
        }
    });
    
    CLIENT.on('change:nick', function() {
    HighlightName = CLIENT.get('nick')
    });

    function buildMessage(message) {
        var el = $('<div class="message"></div>');
        message.type && el.addClass(message.type);
        var time = message.time ? new Date(message.time) : new Date();
        var role = ['god','super','admin','mod','basic','mute','sub'];
        var check = new RegExp('\\b'+ HighlightName +'\\b',"gi");
	if(check.test(message.message)){
	el.append($('<div id="highlightname" class="timestamp"></div>').text(time.format(DATE_FORMAT) + ' '));
	} else{
        el.append($('<div class="timestamp"></div>').text(time.format(DATE_FORMAT) + ' '));
	}
        var content = $('<div class="message-content"></div>').appendTo(el);
        if (message.nick) {
            var parsedFlair = null;
            if (message.flair) {
                parsedFlair = parser.parse(message.flair);
                if (parser.removeHTML(parsedFlair) != message.nick) {
                    parsedFlair = null;
                } else {
                    parser.getAllFonts(message.flair);
                }
            }
            if (parsedFlair) {
                $('<span class="nick"></span>').html(parsedFlair).appendTo(content);
            } else {
                $('<span class="nick"></span>').text(message.nick).appendTo(content);
            }
        }
        if (message.message) {
            var parsed;
            switch (message.type) {
            case 'escaped-message':
                parsed = $('<span></span>').text(message.message).html().replace(/\n/g, '<br/>');
                break;
            case 'personal-message':
            case 'chat-message':
                parser.getAllFonts(message.message);
                parsed = parser.parse(message.message);
                break;
            case 'elbot-response':
                parsed = message.message;
                break;
	    case 'general-message':
		parsed = parser.parse(message.message);
		break;
	    case 'note-message':
		parsed = parser.parse(message.message);
		break;	
	case 'anon-message':
		if(CLIENT.get('role') == null || role.indexOf(CLIENT.get('role')) >= 2){
			parsed = parser.parse( '#6464C0' + '/*anon|' + ': ' + message.message);
		} else {
			parsed = parser.parse( '#6464C0/*' + message.name + '|: ' + message.message);
		}
		break
            default:
                parsed = parser.parseLinks(message.message);
                break;
            }
            $('<span class="content"></span>').html(parsed || message.message).appendTo(content);
        }
        if (message.type == 'spoken-message' && CLIENT.get('mute') != 'on' && CLIENT.get('mute_speak') != 'on') {
            var uri = 'http://www.codefactor.net/tts.php?tl=en&q=' + encodeURIComponent(message.message);
            var html = [ '<audio><source src="', uri, '"></source><embed src="', uri, '"></audio>' ].join('');
            var $audio = $(html).appendTo('body');
            var audio = $audio[0];
            audio.onerror = audio.onpause = function(e) {
                $audio.remove();
            }
            audio.play();
        }
        return el;
    }

    window.scrollToBottom = function() {
        var containerEl = $('#messages');
        var scrollDelta = containerEl.prop('scrollHeight') - containerEl.prop('clientHeight');
        animation && animation.stop(true, false);
        animation = containerEl.animate({
            scrollTop : scrollDelta
        }, {
            duration : 100,
            complete : function() {
                animation = null;
            }
        });
    }

    function appendMessage(el) {
        var containerEl = $('#messages');
        var scrolledToBottom = containerEl.prop('scrollTop') + containerEl.prop('clientHeight') >= containerEl.prop('scrollHeight') - 50;
        el.appendTo(containerEl);
        playAudio('message');
        var scrollDelta = containerEl.prop('scrollHeight') - containerEl.prop('clientHeight');
        if (scrolledToBottom && scrollDelta > 0) {
            scrollToBottom();
        }
    }

    window.imageError = function(el) {
        var $el = $(el);
        var src = $el.attr('src');
        $el.replaceWith($('<a target="_blank"></a>').attr('href', src).text(src));
    }
});

// ------------------------------------------------------------------
// PM Panel
// ------------------------------------------------------------------

(function() {
    var PANELS = {};
    window.PM = {
        show : function(message, el) {
            var id = message.to;
            if (message.to == CLIENT.get('id')) {
                id = message.from;
            }
            var panel = PANELS[id];
            if (!panel) {
                panel = $('<div>').attr('title', 'PM: ' + ONLINE.get(id).get('NICK'));
            }
        }
    };
})();

// ------------------------------------------------------------------
// Input Box Shadow Color
// ------------------------------------------------------------------

$(function() {
    function setHighlightColor(color) {
        var textColor = null;
        if (color) {
            var i = color.lastIndexOf('#');
            if (i >= 0) {
                textColor = color.substring(i + 1);
            } else {
                textColor = color;
            }
            if (/([a-f]{6}|[a-f]{3})/i.test(textColor)) {
                textColor = '#' + textColor;
            }
        } else {
            textColor = '#888';
        }
        $('#input-message')[0].style.boxShadow = '0px 0px 12px ' + textColor;
        $('#input-message')[0].style.border = '1px solid ' + textColor;
    }

    var focused = false;
    $('#input-message').focus(function() {
        focused = true;
        setHighlightColor(CLIENT.get('color'));
    }).blur(function() {
        focused = false;
        this.style.boxShadow = '';
        $('#input-message')[0].style.border = '';
    });

    CLIENT.on('change:color', function(m, color) {
        focused && setHighlightColor(color);
    });
});

// ------------------------------------------------------------------
// Input Form / History
// ------------------------------------------------------------------

$(function() {
    var history = [];
    var historyIndex = -1;
    function submit() {
        var ac = $('#autocomplete');
        if (ac.length == 0 || ac.css('display') == 'none') {
            var text = input.val();
            if (text) {
                CLIENT.submit(text);
            }
            historyIndex = -1;
            history.push(text);
            input.val('');
        }
    }
    var input = $('#input-message').keydown(function(e) {
        var delta = 0;
        switch (e.keyCode) {
        case 13: // enter
            if (!e.shiftKey) {
                e.preventDefault();
                var text = input.val();
                if (text) {
                    CLIENT.submit(text);
                }
                historyIndex = -1;
                history.push(text);
                input.val('');
            }
            return;
        case 38: // up
            if (e.shiftKey) {
                delta = 1;
            }
            break;
        case 40: // down
            if (e.shiftKey) {
                delta = -1;
            }
            break;
        }
        if (delta) {
            historyIndex = Math.max(0, Math.min(history.length - 1, historyIndex + delta));
            text = history[history.length - historyIndex - 1];
            if (text) {
                e.preventDefault();
                input.val(text);
            }
        }
    });
    
    var ctrl = false;
    var hover = null;

    $(document).keydown(function(e){
        if(e.keyCode == 17 && hover != null){
            if(hover.localName == 'img'){
                $('#bigimg')[0].innerHTML = hover.outerHTML;
            }
            ctrl = true;
        }
    })

    $(document).keyup(function(e){
        if(e.keyCode == 17){
            ctrl = false;
            $('#bigimg')[0].innerHTML = '';
        }
    })

	$('#messages').on('mousemove', function(e) {
        hover = e.target;
		if(hover.localName == 'img' && ctrl){
			$('#bigimg')[0].innerHTML = hover.outerHTML;
		} else {
			$('#bigimg')[0].innerHTML = '';
		}
	});
    
    var input = $('#input-message').keyup(function(e) {
        input.css('height', '1px');
        input.css('height', Math.min(Math.max(input.prop('scrollHeight') + 4, 20), $(window).height() / 3) + 'px');
        $(window).resize();
    });
});

// ------------------------------------------------------------------
// Commands
// ------------------------------------------------------------------

(function() {
    window.COMMANDS = {
        help : function() {
            CLIENT.show('Available Commands: /' + CLIENT.getAvailableCommands().join(', /'));
        },
        nick : {
            params : [ 'nick$' ]
        },
        me : {
            params : [ 'message$' ]
        },
        login : {
            params : [ 'password', 'nick$' ]
        },
        unregister : {},
        register : {
            params : [ 'initial_password', 'email_address' ]
        },
        verify : {
            params : verifyByEmail ? [ 'reenter_password', 'verification_code' ] : [ 'reenter_password' ]
        },
        change_password : {
            params : [ 'old_password', 'new_password' ]
        },
        banlist : {role : 'admin'},
        channel_banlist : {role : 'admin'},
        find_ip : {
	    role : 'admin',
            params : [ 'remote_addr' ]
        },
        ban : {
	    role : 'admin',
            params : [ 'nick[|message]' ]
        },
        unban : {
	    role : 'admin',
            params : [ 'id$' ]
        },
        channel_ban : {
	    role : 'admin',
            params : [ 'nick[|message]' ]
        },
        channel_unban : {
	    role : 'admin',
            params : [ 'id$' ]
        },
        kick : {
	    role : 'mod',
            params : [ 'nick[|message]' ]
        },
        access : {
	    role : 'super',
            params : [ 'role', 'access_level', 'nick$' ]
        },
        whoami : {},
        whois : {
            params : [ 'nick$' ]
        },
        topic : {
	    role : 'mod',
            params : [ 'topic$' ]
        },
        note : {
	    role : 'admin',
            params : [ 'message$' ]
        },
        clear : function() {
            $('#messages').html('');
        },
        unmute : function() {
            CLIENT.set('mute', 'off');
        },
        mute : function() {
            CLIENT.set('mute', 'on');
        },
        unmute_speak : function() {
            CLIENT.set('mute_speak', 'off');
        },
        mute_speak : function() {
            CLIENT.set('mute_speak', 'on');
        },
        style : {
            params : [ 'style' ],
            handler : function(params) {
                if (params.style == 'default' || params.style == 'none') {
                    params.style = null;
                }
                CLIENT.set('style', params.style);
            }
        },
        font : {
            params : [ 'font$' ],
            handler : function(params) {
                if (params.font == 'default' || params.font == 'none') {
                    params.font = null;
                }
                CLIENT.set('font', params.font);
            }
        },
        color : {
            params : [ 'color' ],
            handler : function(params) {
                if (params.color == 'default' || params.color == 'none') {
                    params.color = null;
                }
                CLIENT.set('color', params.color);
            }
        },
        flair : {
            params : [ 'flair$' ],
            handler : function(params) {
                if (params.flair == 'default' || params.flair == 'none') {
                    params.flair = null;
                }
				flair = params.flair.replace(/&/g, '\\&')
                CLIENT.set('flair', flair);
            }
        },
        echo : {
            params : [ 'message$' ],
            handler : function(params) {
                CLIENT.show({
                    type : 'chat-message',
                    nick : CLIENT.get('nick'),
                    message : CLIENT.decorate(params.message),
                    flair : CLIENT.get('flair')
                });
            }
        },
        pm : {
            params : [ 'nick|message' ]
        },
        refresh_client : {role : 'super'},
        theme : {
            params : [ 'theme_style$' ]
        },
        reset_user : {
			role : 'super',
            params : [ 'nick' ]
        },
        get : {
            params : [ 'attribute_name' ],
            handler : function(params) {
                var attribute_name = params.attribute_name;
                var valid = 'color font style flair mute mute_speak images note topic marquee bg part'.split(' ');
                if (valid.indexOf(attribute_name) >= 0) {
                    if (attribute_name == 'note') {
                        attribute_name = 'notification';
                    }
                    CLIENT.show({
                        type : 'escaped-message',
                        message : params.attribute_name + ' is currently set to: ' + (CLIENT.get(attribute_name) || 'none')
                    });
                } else {
                    CLIENT.show({
                        type : 'error-message',
                        message : 'Invalid: Variable can be one of [' + valid.join(', ') + ']'
                    });
                }
            }
        },
        speak : {
            params : [ 'message$' ]
        },
        elbot : {
            params : [ 'message$' ]
        },
	c_nick : {
	    role : 'super',
	    params : [ 'nick|c_nick' ]
	},
	toggle_bg : function() {
            CLIENT.set('bg', CLIENT.get('bg') == 'on' ? 'off' : 'on');
	},
	anon : {
	    params : [ 'message$' ]
	},
	part : {
	    params : [ 'message$' ]
	},
	toggle : function(){},
	block : function(){},
	unblock : function(){}
    };

    COMMANDS.colour = COMMANDS.color;
})();

toggled = function(att){
CLIENT.set(att, CLIENT.get(att) == 'on' ? 'off' : 'on');
}

blocked = function(att){
list = []
    ONLINE.each(function(user) {
        var user_name = user.get('nick');
            list.push(user_name);
    });
	if(block.indexOf(att) == -1){
		block.push(att)
		CLIENT.show(att + ' is now blocked')
	} else {
		CLIENT.show({
            message : 'That user is already blocked.',
            type : 'error-message'
        });
	}
}
unblocked = function(att){
index = block.indexOf(att)
	if(block.indexOf(att) != -1){
		block.splice(index,1)
		CLIENT.show(att + ' is not longer blocked.')
	} else {
		CLIENT.show({
            message : 'You don\'t have that user blocked.',
            type : 'error-message'
        });
	}
}

// ------------------------------------------------------------------
// Message Parser
// ------------------------------------------------------------------

parser = {
    linkreg : /([^A-Za-z0-9,.~\-\/:+%&?@=;_\#]|^)((?:http|ftp)s?:\/\/[A-Za-z0-9,.~\-\/:+%&?@=;_\#]+)/g,
    coloreg : '(?:alice|cadet|cornflower|dark(?:slate)?|deepsky|dodger|light(?:sky|steel)?|medium(?:slate)?|midnight|powder|royal|sky|slate|steel)?blue|(?:antique|floral|ghost|navajo)?white|aqua|(?:medium)?aquamarine|azure|beige|bisque|black|blanchedalmond|(?:blue|dark)?violet|(?:rosy|saddle|sandy)?brown|burlywood|chartreuse|chocolate|(?:light)?coral|cornsilk|crimson|(?:dark|light)?cyan|(?:dark|pale)?goldenrod|(?:dark(?:slate)?|dim|light(?:slate)?|slate)?gr(?:a|e)y|(?:dark(?:olive|sea)?|forest|lawn|light(?:sea)?|lime|medium(?:sea|spring)|pale|sea|spring|yellow)?green|(?:dark)?khaki|(?:dark)?magenta|(?:dark)?orange|(?:medium|dark)?orchid|(?:dark|indian|(?:medium|pale)?violet|orange)?red|(?:dark|light)?salmon|(?:dark|medium|pale)?turquoise|(?:deep|hot|light)?pink|firebrick|fuchsia|gainsboro|gold|(?:green|light(?:goldenrod)?)?yellow|honeydew|indigo|ivory|lavender(?:blush)?|lemonchiffon|lime|linen|maroon|(?:medium)?purple|mintcream|mistyrose|moccasin|navy|oldlace|olive(?:drab)?|papayawhip|peachpuff|peru|plum|seashell|sienna|silver|snow|tan|teal|thistle|tomato|wheat|whitesmoke',
    replink : 'Ã©Ã¤!#@&5nÃ¸ÃºENONHEInoheÃ¥Ã¶',
    repslsh : 'Ã¸Ãº!#@&5nÃ¥Ã¶EESCHEInoheÃ©Ã¤',
    fontRegex : /\$([\w \-\,Â®]*)\|(.*)$/,
    multiple : function(str, mtch, rep) {
        var ct = 0;
        while (str.match(mtch) != null && ct++ < 6)
            str = str.replace(mtch, rep);
        return str;
    },
    loadedFonts : {},
    addFont : function(family) {
        if (!this.loadedFonts[family]) {
            this.loadedFonts[family] = true;
            var protocol = 'https:' == document.location.protocol ? 'https' : 'http';
            var url = protocol + '://fonts.googleapis.com/css?family=' + encodeURIComponent(family);
            $('<link rel="stylesheet" href="' + url + '">').appendTo('head');
        }
    },
    getAllFonts : function(str) {
        var match;
        while (match = this.fontRegex.exec(str)) {
            str = str.replace(this.fontRegex, "$2");
            this.addFont(match[1]);
        }
    },
    removeHTML : function(parsed) {
        return $('<span>' + parsed + '</span>').text();
    },
    parseLinks : function(str) {
        // escaping shit
        str = str.replace(/&/gi, '&amp;');
        str = str.replace(/>/gi, '&gt;');
        str = str.replace(/</gi, '&lt;');
        str = str.replace(/\n/g, '\\n');
        str = str.replace(/\\\\n/g, this.repslsh);
        str = str.replace(/\\n/g, '<br />');
        str = str.replace(this.repslsh, '\\\\n');
        // remove my replacement characters. they are not fscking allowed. lol.
        str = str.replace(RegExp(this.replink, 'g'), '');
        str = str.replace(RegExp(this.repslsh, 'g'), '');
        // replace links
        var links = str.match(this.linkreg);
        str = str.replace(this.linkreg, '$1' + this.replink);
        var escs = str.match(/\\./g);
        str = str.replace(/\\./g, this.repslsh);
        // replace escapes
        for (i in escs) {
            str = str.replace(this.repslsh, escs[i][1]);
        }
        // replace links
        for (i in links) {
            var link = links[i];
            if (links[i][0] != 'h' && links[i][0] != 'f')
                link = links[i].replace(/^(.)(.+)$/, '$2');
            str = str.replace(this.replink, '<a target="_blank" href="' + link + '">' + link + '</a>');
        }
        // change spaces to &nbsp;
        escs = str.match(/<[^>]+?>/gi);
        str = str.replace(/<[^>]+?>/gi, this.repslsh);
        str = str.replace(/\s{2}/gi, ' &nbsp;');
        for (i in escs) {
            str = str.replace(this.repslsh, escs[i]);
        }
        return str;
    },
    parse : function(str) {
        // escaping shit
        str = str.replace(/\n/g, '\\n');
        str = str.replace(/&/gi, '&amp;');
        str = str.replace(/>/gi, '&gt;');
        str = str.replace(/</gi, '&lt;');
        str = str.replace(/"/gi, '&quot;');
        str = str.replace(/#/gi, '&#35;');
        str = str.replace(/'/gi, '&#39;');
        str = str.replace(/~/gi, '&#126;');
        str = str.replace(/\\\\n/g, this.repslsh);
        str = str.replace(/\\n/g, '<br />');
        str = str.replace(this.repslsh, '\\\\n');
        // remove my replacement characters. they are not fscking allowed. lol.
        str = str.replace(RegExp(this.replink, 'g'), '');
        str = str.replace(RegExp(this.repslsh, 'g'), '');
        // replace links
        var links = str.match(this.linkreg);
        str = str.replace(this.linkreg, '$1' + this.replink);
        var escs = str.match(/\\./g);
        str = str.replace(/\\./g, this.repslsh);
        // replace underscores, et cetera
	str = this.multiple(str, /\/\!!([^\|]+)\|?/g, '<div id=neon>$1</div>');
        str = this.multiple(str, /\/\^([^\|]+)\|?/g, '<big>$1</big>');
	str = this.multiple(str, /\/\*([^\|]+)\|?/g, '<strong>$1</strong>');
	str = this.multiple(str, /\/\%([^\|]+)\|?/g, '<i>$1</i>');
	str = this.multiple(str, /\/\_([^\|]+)\|?/g, '<u>$1</u>');
	str = this.multiple(str, /\/\-([^\|]+)\|?/g, '<strike>$1</strike>');
	if(CLIENT.get('marquee') == 'on'){str = str.replace(/\/\&amp;([^\|]+)\|?/g, '<div id=marquee>$1</div>')};
	str = this.multiple(str, /\/\@([^\|]+)\|?/g, '<div id=test style="text-shadow: 0 0 2px white;color: transparent;">$1</div>')
	str = this.multiple(str, /\/\!([^\|]+)\|?/g, '<div id=flashing>$1</div>');
        str = this.multiple(str, /\/\&#126;([^\|]+)\|?/g, '<small>$1</small>');
        str = this.multiple(str, /\/\`([^\|]+)\|?/g, '<code>$1</code>');
        // try to replace all >>>/x/??? for links to boards.4chan.org/x/res/???
        str = str.replace(/&gt;&gt;&gt;(\/[a-z0-9]+)\/(\d+)?\/?/gi, ' <a target="_blank" href="http://boards.4chan.org$1/res/$2">$&</a>');
        // if there's any links leading to boards.4chan.org/?/res/ (nothing
        // after /res/), trim them to just /?/
        str = str.replace(/http:\/\/boards.4chan.org\/([a-z0-9]+)\/res\/"/gi, "http://boards.4chan.org/$1/\"");
        // >>23452345
        str = str.replace(/^(&gt;&gt;.+)$/i, '&#35;992222<del> $1</del>');
        // >implying
        str = str.replace(/^(&gt;.+)$/i, '&#35;789922 $1');
        // >
        str = str.replace(/^(&gt;)$/i, '&#35;789922 $1');
        str = str.replace(/(\/)(\?)([a-z0-9]+)?/gi, '<div><a style="color: #992222; text-decoration: none;" target="_blank" href="https://this.spooks.me/$3">$2$3</a></div>');
        // filters
        /*
         * str = str.replace(/(roody poo)+?/gi, '<div>&#35;ff0000r&#35;ff001fo&#35;ff003eo&#35;ff005ed&#35;ff007dy&#35;ff009c
         * &#35;ff00bcp&#35;ff00dbo&#35;ff00fao</div>'); str =
         * str.replace(/(nigger)+?/gi, '<div>&#35;ff0000r&#35;ff001fo&#35;ff003eo&#35;ff005ed&#35;ff007dy&#35;ff009c
         * &#35;ff00bcp&#35;ff00dbo&#35;ff00fao</div>'); str =
         * str.replace(/(faggot)+?/gi, '<div>&#35;e300ffc&#35;c400ffa&#35;a500ffn&#35;8500ffd&#35;6600ffy&#35;4700ff
         * &#35;2700ffa&#35;0800ffs&#35;0016ffs</div>'); str =
         * str.replace(/(candy ass)+?/gi, '<div>&#35;e300ffc&#35;c400ffa&#35;a500ffn&#35;8500ffd&#35;6600ffy&#35;4700ff
         * &#35;2700ffa&#35;0800ffs&#35;0016ffs</div>'); str = str.replace(/(
         * moot)+?/gi, '<div>
         * &#35;ff00bcm&#35;ff00dbi&#35;ff00fas&#35;e300ffs&#35;c400ffi&#35;a500ffn&#35;8500ffg&#35;6600ffn&#35;4700ffo</div>');
         * str = str.replace(/(missingno)+?/gi, '<div>&#35;ff00bcm&#35;ff00dbi&#35;ff00fas&#35;e300ffs&#35;c400ffi&#35;a500ffn&#35;8500ffg&#35;6600ffn&#35;4700ffo</div>');
         * str = str.replace(/(PENIS)+?/gi, '<div>&#35;2700ffP&#35;0800ffE&#35;0016ffN&#35;0036ffI&#35;0055ffS</div>');
         * str = str.replace(/(mods)+?/gi, '<div>&#35;0075fft&#35;0094ffh&#35;00b3ffe&#35;00d3ff
         * &#35;00f2ffp&#35;00ffece&#35;00ffcco&#35;00ffadp&#35;00ff8el&#35;00ff6ee&#35;00ff4f&#39;&#35;00ff30s&#35;00ff10
         * &#35;0eff00c&#35;2dff00h&#35;4dff00a&#35;6cff00m&#35;8cff00p&#35;abff00i&#35;caff00o&#35;eaff00n&#35;fff400s</div>');
         * str = str.replace(/(brony)+?/gi, '<div>&#35;ffd500j&#35;ffb500a&#35;ff9600b&#35;ff7700r&#35;ff5700o&#35;ff3800n&#35;ff1900i&#35;ff0006s</div>');
         * str = str.replace(/(bronies)+?/gi, '<div>&#35;ffd500j&#35;ffb500a&#35;ff9600b&#35;ff7700r&#35;ff5700o&#35;ff3800n&#35;ff1900i&#35;ff0006s</div>');
         * str = str.replace(/(VAGINA)+?/gi, '<div>&#35;ff0083V&#35;ff00a3A&#35;ff00c2G&#35;ff00e1I&#35;fc00ffN&#35;dd00ffA</div>');
         * str = str.replace(/(pony)+?/gi, '<div>&#35;00ffc6n&#35;00ffa7e&#35;00ff87w&#35;00ff68t&#35;00ff49
         * &#35;00ff29g&#35;00ff0ai&#35;14ff00n&#35;34ff00g&#35;53ff00r&#35;72ff00i&#35;92ff00c&#35;b1ff00h</div>');
         * str = str.replace(/(ponies)+?/gi, '<div>&#35;d1ff00s&#35;f0ff00t&#35;ffee00e&#35;ffce00v&#35;ffaf00e&#35;ff9000
         * &#35;ff7000j&#35;ff5100o&#35;ff3200b&#35;ff1200s</div>'); str =
         * str.replace(/(4chan )+?/gi, '<div>&#35;8500ff9&#35;6600ffg&#35;4700ffa&#35;2700ffg
         * </div>'); str = str.replace(/( 4chan)+?/gi, '<div>
         * &#35;8500ff9&#35;6600ffg&#35;4700ffa&#35;2700ffg</div>'); str =
         * str.replace(/(9gag)+?/gi, '<div>&#35;0800ffr&#35;0016ffe&#35;0036ffd&#35;0055ffd&#35;0075ffi&#35;0094fft</div>');
         * str = str.replace(/(reddit)+?/gi, '<div>&#35;ff00db4&#35;ff00fac&#35;e300ffh&#35;c400ffa&#35;a500ffn</div>');
         * str = str.replace(/(twitter)+?/gi, '<div>&#35;00b3fff&#35;00d3ffa&#35;00f2ffc&#35;00ffece&#35;00ffccb&#35;00ffado&#35;00ff8eo&#35;00ff6ek</div>');
         * str = str.replace(/(facebook)+?/gi, '<div>&#35;00ff4fm&#35;00ff30y&#35;00ff10s&#35;0eff00p&#35;2dff00a&#35;4dff00c&#35;6cff00e</div>');
         * str = str.replace(/(myspace)+?/gi, '<div>&#35;8cff00t&#35;abff00w&#35;caff00i&#35;eaff00t&#35;fff400t&#35;ffd500e&#35;ffb500r</div>');
         * str = str.replace(/(newfag)+?/gi, '<div>&#35;ff000co&#35;ff002bl&#35;ff004bd&#35;ff006af&#35;ff0089a&#35;ff00a9g</div>');
         * str = str.replace(/(wikipedia)+?/gi, '<div>&#35;e300ffe&#35;c400ffn&#35;a500ffc&#35;8500ffy&#35;6600ffc&#35;4700ffl&#35;2700ffo&#35;0800ffp&#35;0016ffe&#35;0036ffd&#35;0055ffi&#35;0075ffa&#35;0094ff
         * &#35;00b3ffd&#35;00d3ffr&#35;00f2ffa&#35;00ffecm&#35;00ffcca&#35;00ffadt&#35;00ff8ei&#35;00ff6ec&#35;00ff4fa</div>');
         * str = str.replace(/(encyclopedia dramatica)+?/gi, '<div>&#35;00ff30u&#35;00ff10n&#35;0eff00c&#35;2dff00y&#35;4dff00c&#35;6cff00l&#35;8cff00o&#35;abff00p&#35;caff00e&#35;eaff00d&#35;fff400i&#35;ffd500a</div>');
         * str = str.replace(/(uncyclopedia)+?/gi, '<div>&#35;ff0000w&#35;ff001fi&#35;ff003ek&#35;ff005ei&#35;ff007dp&#35;ff009ce&#35;ff00bcd&#35;ff00dbi&#35;ff00faa</div>');
         * str = str.replace(/(google)+?/gi, '<div>&#35;ff0006b&#35;ff0025i&#35;ff0044n&#35;ff0064g</div>');
         * str = str.replace(/( bing)+?/gi, '<div>
         * &#35;ff0083y&#35;ff00a3a&#35;ff00c2h&#35;ff00e1o&#35;fc00ffo</div>');
         * str = str.replace(/(yahoo)+?/gi, '<div>&#35;ffb500g&#35;ff9600o&#35;ff7700o&#35;ff5700g&#35;ff3800l&#35;ff1900e</div>');
         * str = str.replace(/( NSA)+?/gi, '<div>
         * &#35;7f00ffI&#35;6000ffl&#35;4000ffl&#35;2100ffu&#35;0200ffm&#35;001dffi&#35;003cffn&#35;005bffa&#35;007bfft&#35;009affi</div>');
         * str = str.replace(/(Illuminati)+?/gi, '<div>&#35;dd00ffN&#35;be00ffS&#35;9e00ffA</div>');
         * str = str.replace(/(tumblr)+?/gi, '<div>&#35;555555cancer</div>');
         * str = str.replace(/(gay)+?/gi, '<div>&#35;ff0000k&#35;ff001fa&#35;ff003ew&#35;ff005ea&#35;ff007di&#35;ff009ci</div>');
         * str = str.replace(/(fag )+?/gi, '<div>&#35;ddff00c&#35;fcff00i&#35;ffe100s&#35;ffc200
         * &#35;ffa300s&#35;ff8300c&#35;ff6400u&#35;ff4400m </div>'); str =
         * str.replace(/(rape)+?/gi, '<div>&#35;ff0000t&#35;ff001fi&#35;ff003ec&#35;ff005ek&#35;ff007dl&#35;ff009ce</div>');
         * str = str.replace(/(piss)+?/gi, '<div>&#35;00ff04l&#35;1bff00e&#35;3aff00m&#35;59ff00o&#35;79ff00n&#35;98ff00a&#35;b7ff00d&#35;d7ff00e</div>');
         * str = str.replace(/(loli )+?/gi, '<div>&#35;ff0c00S&#35;ff0012E&#35;ff0032M&#35;ff0051E&#35;ff0070N&#35;ff0090
         * &#35;ff00afD&#35;ff00ceE&#35;ff00eeM&#35;f000ffO&#35;d100ffN&#35;b100ff!
         * </div>'); str = str.replace(/(semen)+?/gi, '<div>&#35;27ff00m&#35;47ff00a&#35;66ff00y&#35;85ff00o&#35;a5ff00n&#35;c4ff00a&#35;e3ff00i&#35;fffa00s&#35;ffdb00e</div>');
         * str = str.replace(/(edgy)+?/gi, '<div>&#35;cb0b0be&#35;971717d&#35;632323g&#35;2f2f2fy</div>');
         */
        // endfilters
        nohtml = str.replace(/<\/?[^>]+(>|$)/g, "");
	nohtml = nohtml.replace('/+','');
        str = str.replace(/(\/\+ )(.+)$/i, '<input type="text" onClick="this.setSelectionRange(0, this.value.length)" readonly style=" width: calc(90% - 10%); padding-right: 5px; padding-left: 5px; border: 1px solid #0C0D0E; border-radius: 5px; -moz-border-radius: 5px; -khtml-border-radius: 5px; -webkit-border-radius: 5px; background: #202020; color: #0F0; font-size: 14px; font-family: "Helvetica Neue",Helvetica,Arial,sans-serif; font-weight: normal; box-shadow: rgba(255, 255, 255, 0.1) 0 1px 0, rgba(0, 0, 0, 0.8) 0 1px 7px 0px inset;" value="'+nohtml+'"/>');
        str = this.multiple(str, /&#35;&#35;([\da-f]{6})(.+)$/i, '<span style="background-color: #$1;">$2</span>');
        str = this.multiple(str, /&#35;&#35;([\da-f]{3})(.+)$/i, '<span style="background-color: #$1;">$2</span>');
        str = this.multiple(str, /&#35;([\da-f]{6})([^;].*)$/i, '<span style="color: #$1;">$2</span>');
        str = this.multiple(str, /&#35;([\da-f]{3})([^;](?:..[^;].*|.|..|))$/i, '<span style="color: #$1;">$2</span>');
        str = this.multiple(str, RegExp('&#35;&#35;(' + this.coloreg + ')(.+)$', 'i'), '<span style="background-color: $1;">$2</span>');
        str = this.multiple(str, RegExp('&#35;(' + this.coloreg + ')(.+)$', 'i'), '<span style="color: $1;">$2</span>');
        str = this.multiple(str, this.fontRegex, '<span style="font-family:\'$1\'">$2</span>');
        // replace escapes
        for (i in escs) {
            str = str.replace(this.repslsh, escs[i][1]);
        }
        // replace links
        for (i in links) {
            var link = links[i];
            if (links[i][0] != 'h' && links[i][0] != 'f')
                link = links[i].replace(/^(.)(.+)$/, '$2');
            str = str.replace(this.replink, '<a target="_blank" href="' + link + '">' + link + '</a>');
        }

            var img = /(<a target="_blank" href="[^"]+?">)([^<]+?\.(?:gif|jpg|jpeg|png|bmp))<\/a>/i.exec(str);

            if (img && CLIENT.get('images') == 'on') {
                var blacklisted = false;
                for ( var i = 0; i < BLACKLIST.length && !blacklisted; i++) {
                    blacklisted = img[2].indexOf(BLACKLIST[i]) >= 0;
                }
                if (!blacklisted) {
                    str = str.replace(img[0], img[1] + '<img src="' + img[2] + '" onload="scrollToBottom()" onerror="imageError(this)" /></a>');
                }
            }
        

        str = str.replace(/<a [^>]*href="[^"]*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?"]*)[^"]*">([^<]*)<\/a>/, '<a target="_blank" href="$2">$2</a> <a href="javascript:void(0)" onclick="video(event, \'youtube\', \'$1\')" class="show-video">[video]</a>');
        str = str.replace(/<a [^>]*href="[^"]*vimeo.com\/(\d+)">([^<]*)<\/a>/, '<a target="_blank" href="$2">$2</a> <a href="javascript:void(0)" onclick="video(event, \'vimeo\', \'$1\')" class="show-video">[video]</a>');
        str = str.replace(/<a [^>]*href="[^"]*liveleak.com\/ll_embed\?f=(\w+)">([^<]*)<\/a>/, '<a target="_blank" href="$2">$2</a> <a href="javascript:void(0)" onclick="video(event, \'liveleak\', \'$1\')" class="show-video">[video]</a>');
        str = str.replace(/<a [^>]*href="([^'"]*\.webm)">([^<]*)<\/a>/i, '<a target="_blank" href="$2">$2</a> <a href="javascript:void(0)" onclick="video(event, \'html5\', \'$1\')" class="show-video">[video]</a>');
        str = str.replace(/<a [^>]*href="[^"]*ustream.tv\/embed\/(\d+)\?v=3&amp;wmode=direct">([^<]*)<\/a>/, '<a target="_blank" href="$2">$2</a> <a href="javascript:void(0)" onclick="video(event, \'ustream\', \'$1\')" class="show-video">[video]</a>');
        // change spaces to &nbsp;
        escs = str.match(/<[^>]+?>/gi);
        str = str.replace(/<[^>]+?>/gi, this.repslsh);
        str = str.replace(/\s{2}/gi, ' &nbsp;');
        for (i in escs) {
            str = str.replace(this.repslsh, escs[i]);
        }
        return str;
    }
};

// ------------------------------------------------------------------
// Height Adjustment
// ------------------------------------------------------------------

$(function() {
    function resize() {
        var width = $(window).width();
        var height = $(window).height();
        var input = $('#input-bar');
        $('.full-height').each(function() {
            var $this = $(this);
            var padding = $this.outerHeight(true) - $this.height();
            $this.css('height', (height - input.outerHeight(true) - padding) + 'px');
        });
    }
    $(window).resize(resize);
    resize();
});

// ------------------------------------------------------------------
// Custom Scroll Bar
// ------------------------------------------------------------------

(function() {
    var HAS_SCROLL;

    function hasScrollBar() {
        var tester = $('<div style="width:50px;height:50px;overflow:auto;position:absolute"><div style="width:100px;height:100px"></div></div>').appendTo('body');
        var result = tester.prop('clientWidth') < tester.prop('offsetWidth');
        tester.remove();
        return result;
    }

    window.hasScrollBar = function() {
        return HAS_SCROLL = (HAS_SCROLL == null ? hasScrollBar() : HAS_SCROLL);
    }
})();

$(function() {
    function getScrollBarWidth() {
        var t1 = $('<div></div>').css({
            overflow : 'auto',
            height : '50px'
        }).append($('<div></div>').css('height', '100px'));
        var cw = t1.appendTo('body')[0].clientWidth;
        var ow = t1[0].offsetWidth;
        t1.remove();
        return ow - cw;
    }

    function initScroll() {
        var shim = $('<div class="shim"></div>').on('selectstart', function(e) {
            e.preventDefault();
        });
        var msgel = $('#messages').css('margin-right', -getScrollBarWidth()).css('overflowY', 'scroll');
        $('#vertical-scroll-bar .handle').on('mousedown touchstart', function(start) {
            var top = msgel.prop('scrollTop');
            shim.appendTo('body');
            function scrollMove(move) {
                var sh = msgel.prop('scrollHeight');
                var ch = msgel.prop('clientHeight');
                var st = Math.max(0, Math.min(sh - ch, top + (move.pageY - start.pageY) * sh / ch));
                msgel.prop('scrollTop', st);
            }
            var el = $(window).on('mousemove touchmove', scrollMove).on('mouseup touchend', function() {
                shim.detach();
                el.off('mousemove touchmove', scrollMove);
            });
            start.preventDefault();
        }).on('selectstart', function(e) {
            e.preventDefault();
        });
    }

    function repositionScroll() {
        var messages = $('#messages');
        var scrollBar = $('#vertical-scroll-bar');
        var handle = $('.handle', scrollBar);
        var sh = messages.prop('scrollHeight');
        var st = messages.prop('scrollTop');
        messages.prop('scrollLeft', 0);
        var ch = messages.prop('clientHeight');
        var hh = ch * ch / sh;
        var ht = st * ch / sh;
        handle.css({
            top : ht + 'px',
            height : hh + 'px',
            display : ch == sh ? 'none' : 'block'
        });
    }

    if (hasScrollBar()) {
        $(window).resize(repositionScroll);
        $('#messages').scroll(repositionScroll);
        initScroll();
    } else {
        $('html').addClass('noScroll');
    }
});

// ------------------------------------------------------------------
// Autocomplete
// ------------------------------------------------------------------

$(function() {
    var autoCompleteList = false;

    $('<div id="autocomplete"></div>').css('bottom', $('#input-message').outerHeight() + 20 + 'px').appendTo('body');
    $('#input-message').keydown(function(e) {
        if (e.keyCode == 9 && !autoCompleteList) {
            // on tab
            e.preventDefault();
            var match = $(this).val().match(/\S+?$/);
            var v = match && match[0].toLowerCase();
            var list = [];
            ONLINE.each(function(user) {
                var user_name = user.get('nick');
                if (!v || user_name.toLowerCase().indexOf(v) == 0) {
                    list.push(user_name);
                }
            });
            $('#autocomplete').show();
            $('#autocomplete').html('');
            $(list).each(function(i) {
                $('#autocomplete').append('<span>' + list[i] + '</span>');
            });
            autoCompleteList = list;
        } else if (e.keyCode == 9 && autoCompleteList) {
            e.preventDefault();
            var list = autoCompleteList;
            if (list.length == 0 || list[0] === undefined) {
                autoCompleteList = false;
                $('#autocomplete').hide();
                this.value += ' ';
            } else if (list.length == 1) {
                autoCompleteList = null;
                $('#autocomplete').hide();
                var x = $(this).val().split(' ');
                x[x.length - 1] = (x[0][0] == "/" ? list[0] : list[0].replace(/([`~^%\-_\\#*]|:\/\/)/g, '\\$1'));
                $(this).val(x.join(' '));
            } else {
                list.push(list.shift());
                $('#autocomplete').html('');
                $(list).each(function(i) {
                    $('#autocomplete').append('<span>' + list[i] + '</span>');
                });
            }
        } else if (e.keyCode == 27 && autoCompleteList) {
            e.preventDefault();
            autoCompleteList = false;
            $('#autocomplete').hide();
        } else if (autoCompleteList) {
            e.preventDefault();
            var list = autoCompleteList;
            autoCompleteList = false;
            $('#autocomplete').hide();
            var chr = '';
            if (e.keyCode > 47 && e.keyCode < 58) {
                chr = String.fromCharCode(e.keyCode);
            } else if (e.keyCode > 65 && e.keyCode < 91) {
                chr = String.fromCharCode(e.keyCode + 32);
            } else if (e.keyCode > 95 && e.keyCode < 106) {
                chr = String.fromCharCode(e.keyCode - 48);
            } else if (e.keyCode > 105 && e.keyCode < 112 && e.keyCode != 108) {
                chr = String.fromCharCode(e.keyCode - 64);
            } else if (e.keyCode > 218 && e.keyCode < 222) {
                chr = String.fromCharCode(e.keyCode - 128);
            } else if (e.keyCode > 188 && e.keyCode < 192) {
                chr = String.fromCharCode(e.keyCode - 144);
            } else {
                switch (e.keyCode) {
                case 186:
                    chr = ';';
                    break;
                case 187:
                    chr = '=';
                    break;
                case 188:
                    chr = ',';
                    break;
                case 192:
                    chr = '`';
                    break;
                case 222:
                    chr = '\'';
                    break;
                case 32:
                    chr = ' ';
                    break;
                default:
                    break;
                }
            }
            if (list[0] === undefined) {
                if (chr == '') {
                    chr = ' ';
                }
                this.value += chr;
            } else {
                var x = $(this).val().split(' ');
                x[x.length - 1] = (x[0][0] == "/" ? list[0] : list[0].replace(/([`~^%\-_$|\\#\*]|:\/\/)/g, '\\$1')) + chr;
                $(this).val(x.join(' '));
            }
        }
    });
});

// ------------------------------------------------------------------
// Audio
// ------------------------------------------------------------------

(function() {
    var SOUNDS = {
        message : '/audio/Bing.mp3'
    };
    for ( var sound in SOUNDS) {
        var html = [ '<audio id="', sound, '_audio"><source src="', SOUNDS[sound], '"></source><embed width=0 height=0 src="', SOUNDS[sound], '"></audio>' ].join('');
        $(html).appendTo('body');
    }
    window.playAudio = function(sound) {
        if (CLIENT.get('mute') != 'on') {
            var el = $('#' + sound + '_audio');
            el[0] && el[0].play();
        }
    }
})();

$(function() {
    CLIENT.on('change:mute change:mute_speak', function(m, mute) {
        if (mute == 'on') {
            $('audio').each(function() {
                this.pause();
            });
        }
    });
});

// ------------------------------------------------------------------
// Video
// ------------------------------------------------------------------

function video(event, type, input) {
    function stop(e) {
        e.stopPropagation();
        e.preventDefault();
    }
    function hide() {
        videoOverlay.hide();
        $('.container', videoOverlay).html('');
    }
    if (event.stopPropagation) {
        event.stopPropagation();
    } else {
        event.cancelBubble = true;
    }
    var embed;
    switch (type) {
    case 'youtube':
        embed = '<iframe width="100%" height="100%" src="//www.youtube.com/embed/' + input + '" frameborder="0" allowfullscreen></iframe>';
        break;
    case 'html5':
        embed = '<video width="100%" height="100%" src="' + input + '" controls></video>';
        break;
    case 'liveleak':
        embed = '<iframe width="100%" height="100%" src="http://www.liveleak.com/ll_embed?f=' + input + '" frameborder="0" allowfullscreen></iframe>';
        break;
    case 'vimeo':
        embed = '<iframe src="//player.vimeo.com/video/' + input + '" width="100%" height="100%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
        break;
    case 'ustream':
        embed = '<iframe src="//www.ustream.tv/embed/' + input + '?v=3&amp;wmode=direct" width="100%" height="100%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
        break;
    }
    var videoOverlay = $('.video-overlay');
    if (videoOverlay.length == 0) {
        videoOverlay = $('<div class="video-overlay" unselectable="on"></div>').css({
            position : 'absolute',
            top : '50%',
            left : '50%'
        }).appendTo('body');
        var header = $('<div></div>').css({
            cursor : 'move',
            userSelect : 'none',
            backgroundColor : '#444'
        }).appendTo(videoOverlay);
        $('<a href="javascript:void(0)">[close]</a>').click(hide).appendTo(header).mousedown(function(e) {
            e.stopPropagation();
        });
        var dragging = false;
        var shim = null;
        var container = $('<div class="container"></div>').css({
            width : '560px',
            height : '315px'
        }).appendTo(videoOverlay);
        header.mousedown(function(e) {
            dragging = e;
            shim = $('<div></div>').css({
                backgroundColor : 'red',
                position : 'absolute',
                top : 0,
                left : 0,
                zIndex : 1000,
                opacity : 0,
                width : $(window).width() + 'px',
                height : $(window).height() + 'px'
            }).appendTo('body').bind('selectstart', stop);
            $(document).bind('selectstart', stop);
        }).bind('selectstart', stop);
        $(window).mousemove(function(e) {
            if (dragging) {
                var dx = e.pageX - dragging.pageX;
                var dy = e.pageY - dragging.pageY;
                var x = parseInt(videoOverlay.css('marginLeft')) || 0;
                var y = parseInt(videoOverlay.css('marginTop')) || 0;
                videoOverlay.css({
                    marginLeft : (x + dx) + 'px',
                    marginTop : (y + dy) + 'px'
                });
                dragging = e;
            }
        }).mouseup(function(e) {
            dragging = false;
            shim && shim.remove();
            $(document).unbind('selectstart', stop);
        });
        videoOverlay.click(function(e) {
            e.stopPropagation();
        });
    }
    $('.container', videoOverlay).html(embed);
    videoOverlay.css({
        marginTop : (-videoOverlay.height() / 2) + 'px',
        marginLeft : (-videoOverlay.width() / 2) + 'px'
    });
    videoOverlay.show();
}

// ------------------------------------------------------------------
// Mouse Positions
// ------------------------------------------------------------------

$(function() {
    var position = null, x, y;
    $(window).mousemove(function(e) {
        x = e.clientX / $(window).width();
        y = e.clientY / $(window).height();
    });
    setInterval(function() {
        if (!position || position.x != x || position.y != y) {
            CLIENT.updateMousePosition(position = {
                x : x,
                y : y
            });
        }
    }, 50);
    CLIENT.on('updateMousePosition', function(msg) {
        var el = $('#cursor-' + msg.id);
        if (el.length == 0) {
            var user = ONLINE.get(msg.id);
            var nick = $('<span class="nick"></span>').text(user.get('nick'));
            el = $('<div id="cursor-' + msg.id + '" class="mouseCursor"></div>').append(nick).appendTo('body');
            el.css('display', CLIENT.get('cursors') == 'off' ? 'none' : 'block');
            user.on('change:nick', function(m, newNick) {
                nick.text(newNick);
            });
        }
        el.css({
            left : (msg.position.x * 100) + '%',
            top : (msg.position.y * 100) + '%'
        });
    });
    ONLINE.on('remove', function(user) {
        $('#cursor-' + user.get('id')).remove();
    });
    ONLINE.on('reset', function() {
        $('.mouseCursor').remove();
    });
    CLIENT.on('change:cursors', function(m, cursors) {
        $('.mouseCursor').css({
            display : cursors == 'off' ? 'none' : 'block'
        })
    });
});
