var DATE_FORMAT = 'shortTime';
var BLACKLIST = [ 'bruno.sucks', 'donkey.dong'];

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

    socket.on('update', function(info) {
        CLIENT.set(info);
    });
    
    socket.on('centermsg', function(data){
        $('#sam').remove()
        $('#messages').append("<table id=sam style='width:100%;'><tr><td style=text-align:center;vertical-align:middle;> " + parser.parse(data.msg) +"</td></tr><table>")
    });
    
    socket.on('alive', function(){
        socket.emit('alive')
    });
    
    socket.on('playvid', function(url){
        if(url.url == "stop" || mute == 'on'){
            $("#youtube")[0].innerHTML = ""
        } else {
            $("#youtube")[0].innerHTML = "<iframe width=\"420\" height=\"345\" src=\"https://www.youtube.com/embed/" + url.url +"?autoplay=1\" frameborder=\"0\" allowfullscreen></iframe>"
        }
    });

    socket.on('message', function(msg) {
        if(CLIENT.get('block').indexOf(msg.nick) == -1){
            CLIENT.show(msg);
        }
    });
    
    socket.on('submessage', function(msg) {
        if(msg.role == 'sub'){
            CLIENT.show(msg);
        }
    });

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
        if (name == 'pm') {
            var pm = /^(.*?[^\\])\|([\s\S]*)$/.exec(input);
            if (pm) {
                var nick = pm[1].replace('\\|', '|');
                var message = pm[2];
                return {
                    nick : nick,
                    message : message,
                }; 
            }
        } else if(name == 'toggle'){
            toggled(input)
        } else if(name == 'block'){
            blocked(input)
        } else if(name == 'unblock') {
            unblocked(input)
        } else if (name == 'kick' || name == "ban" || name == "permaban" || name == "speak") {
            var pm = /^(.*?[^\\])(?:\|([\s\S]*))?$/.exec(input);
            if (pm) {
                var nick = pm[1].replace('\\|', '|');
                var message = pm[2]  || " ";
                if(name == 'speak'){
                    return {
                        voice : nick,
                        message : message
                    }; 
                } else {
                    return {
                        nick : nick,
                        message : message
                    };
                }
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
            'color font style mute mute_speak nick password images flair cursors styles bg role part block menu_top menu_left menu_display vHost'.split(' ').forEach(function(key) {
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
            'color font style flair mute mute_speak images cursors styles bg role part vHost'.split(' ').forEach(function(key) {
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
    var check = new RegExp('\\b'+ CLIENT.get('nick') +'\\b',"gi");
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
        $("#icon").attr("href","http://spooks.me/img/icon2.ico");
        blurred = false;
        updateTitle();
    });
    CLIENT.on('message', function(message) {
        if (blurred) {
            if(check.test(message.message)){
                $("#icon").attr("href","http://spooks.me/img/icon.ico");
            }
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
        CLIENT.set('bg', 'on'); 
    }
    if (CLIENT.get('styles') == null){
        CLIENT.set('styles', 'on'); 
    }
    if (CLIENT.get('block') == null){
        CLIENT.set('block', ''); 
    }
});

// ------------------------------------------------------------------
// Theme
// ------------------------------------------------------------------

$(function() {
    CLIENT.on('change:theme', function(m, theme) {
        if (theme && CLIENT.get('bg') == 'on' && theme != 'default') {
            $('#messages').css('background', theme);
            CLIENT.set('old', theme);
        } else {
            CLIENT.set('old', theme);
        }
    });
    CLIENT.on('change:theme_style', function(m, theme_style) {
        if (theme_style) {
            $('body').attr("class", theme_style);
        } else {
            $('body').attr('class', '');
        }
    });
    CLIENT.on('change:bg', function(m, bg){
        if(bg == 'on'){
            $('#messages').css('background', CLIENT.get('old'));
        } else {
            $('#messages').css('background', 'url(http://i.imgur.com/b9xE8sb.png?1) center / auto 100% no-repeat rgb(17, 17, 17)');
        }
    });
});

// ------------------------------------------------------------------
// Online User Tracking
// ------------------------------------------------------------------

$(function() {
    function updateCount() {
        $('#online-users .category').text('Online (' + ONLINE.size() + ')');
    }
    
    if(CLIENT.get('menu_display') != 'undefined'){
        $('.menu-container').css('display',CLIENT.get('menu_display'));
        $('.menu-container').css('left',CLIENT.get('menu_left'));
        $('.menu-container').css('top',CLIENT.get('menu_top'));
    }
    
    ONLINE.on('add', function(user) {
        var li = $('<li class="users"></li>').attr({
            id : 'online-' + user.get('id')
        }).appendTo('#online');
  
  
 $(function(){
 $.contextMenu({
        selector: '.users', 
        className: 'data-title',
        trigger: 'left',
        items: {
            "PM": {
  name: "PM",
  callback: function(){ $('#input-message').focus().val('').val('/pm ' + $.trim(this[0].textContent) + '|'); }
  },
  "sep1": "---------",
            "Kick": {
  name: "Kick",
  callback: function(){ CLIENT.submit('/kick '+this[0].textContent) }
  },
            "Ban": {
  name: "Ban",
  callback: function(){ CLIENT.submit('/ban '+this[0].textContent) }
  },
  "sep2": "---------",
            "Block": {
  name: "Block",
  callback: function(){ CLIENT.submit('/block '+this[0].textContent) }
  },
            "UnBlock": {
  name: "UnBlock",
  callback: function(){ CLIENT.submit('/unblock '+this[0].textContent) }
  },
            "Whois": {
  name: "Whois",
  callback: function(){ CLIENT.submit('/whois '+this[0].textContent) }
  }
        }
 });
 $('li').click(function(e){
    $('.data-title').attr('data-menutitle', e.target.textContent);
 });
 });
    
        var nick = $('<span></span>').text(user.get('nick')).appendTo(li);
        li.append(' ');
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
    $('#online-users').draggable({
        containment: '#messages',
        drag : function(){
            CLIENT.set('menu_left',$(this).css('left'));
            CLIENT.set('menu_top',$(this).css('top'));
        }
	}).resizable({ handles: "all" });
    $('.ui-draggable-handle').css('position','absolute');
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
    
    function buildMessage(message) {
        var el = $('<div class="message"></div>');
        var sound;
        message.type && el.addClass(message.type);
        var time = message.time ? new Date(message.time) : new Date();
        var role = ['god','super','admin','mod','basic','mute','sub'];
        var check = new RegExp('\\b'+ CLIENT.get('nick') +'\\b',"gi");
        if(check.test(message.message)){
            el.append($('<div id="highlightname" class="timestamp"></div>').text(time.format(DATE_FORMAT) + ' '));
            sound = 'name'
        } else{
            el.append($('<div class="timestamp"></div>').text(time.format(DATE_FORMAT) + ' '));
            sound = 'message'
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
            switch(message.hat){
                case 'C_hat': 
                    $('<span class="hat" style="background:url(\'css/img/'+message.hat+'.png\') no-repeat center;background-size: 30px 20px;"></span>').appendTo(content);
                    break;
                case 'Dunce':
                    $('<span class="hat" style="background:url(\'css/img/'+message.hat+'.png\') no-repeat center;background-size: 26px 28px;"></span>').appendTo(content);
                    break;
                case 'Crown':
                    $('<span class="hat" style="background:url(\'css/img/'+message.hat+'.png\') no-repeat center;background-size: 30px 25px;"></span>').appendTo(content);
                    break;
                case 'Antlers':
                    $('<span class="hat" style="background:url(\'css/img/'+message.hat+'.png\') no-repeat center;background-size: 26px 28px;top:-27px;left:35px;"></span>').appendTo(content);
                    break;
                case 'G_hat':
                    $('<span class="hat" style="background:url(\'css/img/'+message.hat+'.png\') no-repeat center;background-size: 30px 20px;"></span>').appendTo(content);
                    break;
                case 'Newyear':
                    $('<span class="hat" style="background:url(\'css/img/'+message.hat+'.png\') no-repeat center;background-size: 30px 25px;top:-26px"></span>').appendTo(content);
                    break;
                case 'EdgyNewyear':
                    $('<span class="hat" style="background:url(\'css/img/'+message.hat+'.png\') no-repeat center;background-size: 50px 45px;top:-26px"></span>').appendTo(content);
                    break;
                case 'Gold':
                    $('<span class="hat" style="background:url(\'css/img/'+message.hat+'.png\') no-repeat center;background-size: 30px 25px;top:-26px"></span>').appendTo(content);
                    break;
                case 'Coin':
                    $('<span class="hat" style="background:url(\'css/img/'+message.hat+'.png\') no-repeat center;background-size: 30px 30px;"></span>').appendTo(content);
                    break;
                default:
                    $('<span class="hat"></span>').appendTo(content);
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
            var voices = ['default','yoda','clever', 'old', 'loli', 'whisper', 'badguy', 'aussie', 'terrorist', 'japan', 'alien', 'nigga', 'demon'];
            if(voices.indexOf(message.voice) > 0){
                var uri = message.source
            } else {
                var uri = 'http://tts-api.com/tts.mp3?q=' + encodeURIComponent(message.message);
            }
            var html = [ '<audio autoplay="autoplay"><source src="', uri, '" type="audio/mpeg"></source><embed src="', uri, '"></audio>' ].join('');
            var $audio = $(html).appendTo('body');
            var audio = $audio[0];
            audio.onerror = audio.onpause = function(e) {
                $audio.remove();
            }
            audio.play();
        }
        playAudio(sound);
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
            CLIENT.set('menu_display',$('.menu-container').css('display') == 'none' ? 'block' : 'none')
            $('.menu-container').css('display',CLIENT.get('menu_display'));
            if(CLIENT.get('left') != 'undefined'){
                $('.menu-container').css('left',CLIENT.get('menu_left'));
                $('.menu-container').css('top',CLIENT.get('menu_top'));
            }
            //CLIENT.show('Available Commands: /' + CLIENT.getAvailableCommands().join(', /'));
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
            params : [ 'initial_password' ]
        },
        verify : {
            params : [ 'reenter_password' ]
        },
        change_password : {
            params : [ 'old_password', 'new_password' ]
        },
        banlist : {role : 'admin'},
        permabanlist : {role : 'admin'},
        find_ip : {
            role : 'admin',
            params : [ 'remote_addr' ]
        },
        permaban : {
            role : 'admin',
            params : [ 'nick[|message]' ]
        },
        unpermaban : {
            role : 'admin',
            params : [ 'id$' ]
        },
        ban : {
            role : 'admin',
            params : [ 'nick[|message]' ]
        },
        unban : {
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
            role : 'super',
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
                } else if (parser.isColor(params.color)){
                    CLIENT.set('color', params.color);
                } else {
                    CLIENT.show({
                        type : 'error-message',
                        message : 'I don\'t think that is a color. http://en.wikipedia.org/wiki/Web_colors'
                    });
                }
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
                var valid = 'color font style flair mute mute_speak images note topic styles bg part block theme'.split(' ');
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
            params : [ '[voice|]message' ]
        },
        elbot : {
            params : [ 'message$' ]
        },
        anon : {
            params : [ 'message$' ]
        },
        part : {
            params : [ 'message$' ]
        },
        toggle : function(){},
        block : function(){},
        unblock : function(){},
        play : {
            role : 'super',
            params : [ 'url' ]
        },
        safe : function(){
            CLIENT.set('bg','off'),
            CLIENT.set('images','off'),
            CLIENT.set('mute_speak','on')
        },
        unsafe : function(){
            CLIENT.set('bg','on'),
            CLIENT.set('images','on'),
            CLIENT.set('mute_speak','off')
        },
        msg : {
            params : [ 'message$' ]
        },
        mask : {
            params : [ 'vHost' ]
        },
        ghost : {}
    };

    COMMANDS.colour = COMMANDS.color;
})();

toggled = function(att){
    if (att == 'bg' && CLIENT.get('bg') == 'off'){
        $('#messages').css('background', CLIENT.get('old'));
    } 
    if(att != 'style' && att != 'font'){
        CLIENT.set(att, CLIENT.get(att) == 'on' ? 'off' : 'on');
    }
}

blocked = function(att){
    block = CLIENT.get('block').split(',')
    if(block.indexOf(att) == -1){
        block.push(att)
            CLIENT.show(att + ' is now blocked')
    } else {
        CLIENT.show({
            message : 'That user is already blocked.',
            type : 'error-message'
        });
    }
CLIENT.set('block',block.join(','))
}
unblocked = function(att){
    block = CLIENT.get('block').split(',')
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
CLIENT.set('block',block.join(','))
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
        while (str.match(mtch) != null && ct++ < 10)
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
    isColor : function(str){
        check = new RegExp("/(^#[0-9A-F]{6})|(^[0-9A-F]{6})|(^#[0-9A-F]{3})|(^[0-9A-F]{3})|(#" + this.coloreg + ")","i");
        return check.test(str)
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
        if(CLIENT.get('styles') == 'on'){
         str = this.multiple(str, /\/\!!([^\|]+)\|?/g, '<div id=neon>$1</div>');
         str = this.multiple(str, /\/\&#35;([^\|]+)\|?/g, '<div id=spoil>$1</div>');
         str = this.multiple(str, /\/\+([^\|]+)\|?/g, '<div id=rotat>$1</div>');
         str = this.multiple(str, /\/\^([^\|]+)\|?/g, '<big>$1</big>');
         str = this.multiple(str, /\/\*([^\|]+)\|?/g, '<strong>$1</strong>');
         str = this.multiple(str, /\/\%([^\|]+)\|?/g, '<i>$1</i>');
         str = this.multiple(str, /\/\_([^\|]+)\|?/g, '<u>$1</u>');
         str = this.multiple(str, /\/\-([^\|]+)\|?/g, '<strike>$1</strike>');
         str = str.replace(/\/\&amp;([^\|]+)\|?/g, '<div id=marquee>$1</div>');
         str = this.multiple(str, /\/\@([^\|]+)\|?/g, '<div id=test style="text-shadow: 0 0 2px white;color: transparent;">$1</div>')
         str = this.multiple(str, /\/\!([^\|]+)\|?/g, '<div id=flashing>$1</div>');
         str = this.multiple(str, /\/\&#126;([^\|]+)\|?/g, '<small>$1</small>');
         str = this.multiple(str, /\/\`([^\|]+)\|?/g, '<code>$1</code>');
        }
        // try to replace all >>>/x/??? for links to 8ch.net/x/res/???
        str = str.replace(/&gt;&gt;&gt;(\/[a-z0-9]+)\/(\d+)?\/?/gi, ' <a target="_blank" href="https://8ch.net$1/res/$2">$&</a>');
        // if there's any links leading to 8ch.net/?/res/ (nothing
        // after /res/), trim them to just /?/
        str = str.replace(/https:\/\/8ch.net\/([a-z0-9]+)\/res\/"/gi, "https://8ch.net/$1/\"");
        // >>23452345
        str = str.replace(/^(&gt;&gt;.+)$/i, '&#35;992222<del> $1</del>');
        // >implying
        str = str.replace(/^(&gt;.+)$/i, '&#35;789922 $1');
        str = str.replace(/^(&gt;.+)(\\n.+)$/i, '<div>&#35;789922 $1</div>$2');
        // >
        str = str.replace(/^(&gt;)$/i, '&#35;789922 $1');
        str = str.replace(/(\/\?)([^\|]+)\|([^\|]+)\|?/gi, '<div><a target="_blank" href="$2">$3</a></div>');
        //embed
        str = str.replace(/embed(\S*)(.*)/g, '<a target="_blank" href="$1">$1</a> <a target="_blank" onclick="video(\'\', \'embed\', \'$1\')">[embed]</a>');
        // filters
        //*
        // endfilters
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
        $('.full-width').each(function() {
            var $this = $(this);
            $this.css('width', $(window).width() + 'px');
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
        var msgel = $('#messages').css('margin-right', -getScrollBarWidth()).css('overflowY', 'auto');
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
        message : '/audio/Bing.mp3',
        name : '/audio/Bwoop.wav'
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
    case 'embed':
        embed = '<iframe width="100%" height="100%" src="' + input + '" frameborder="0" allowfullscreen></iframe>';
        break;
    }
    var videoOverlay = $('.video-overlay');
    if (videoOverlay.length == 0) {
        videoOverlay = $('<div class="video-overlay" unselectable="on"></div>').css({
            position : 'absolute',
            top : '50%',
            left : '50%',
            width : '528px',
            height : '322px',
            zIndex : '5'
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
            width : '100%',
            height : '90%'
        }).appendTo(videoOverlay);
        var bottom = $('<div class="bottom"></div>').css({
            width : '100%',
            height : '15px',
            backgroundColor : '#444'
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
    $(".video-overlay").resizable({
        start: function( event, ui ) {$(".video-overlay iframe").css("display","none")},
        stop: function( event, ui ) {$(".video-overlay iframe").css("display","block")}
    });
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
            if (user === undefined) return;
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
