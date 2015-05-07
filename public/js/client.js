var DATE_FORMAT = 'shortTime';
var BLACKLIST = [ 'bruno.sucks', 'donkey.dong'];
var localCount = 0, lastNick;

// ------------------------------------------------------------------
// Client
// ------------------------------------------------------------------

ONLINE = new Backbone.Collection();

$(function() {
    var socket = io('/' + window.channel);
    var first = true;
    var requestId = 0;
    var requests = {};
    var roles = ['god','super','admin','mod','basic','mute'];

    Game.init(socket);

    socket.on('join', function(user) {
        ONLINE.add(user);
        CLIENT.show({
            type : 'general-message',
            message : user.nick + ' has joined '
        });
 
    if(CLIENT.get('part') != undefined){
        socket.emit('SetPart', CLIENT.get('part'));
    }
    });

    socket.on('online', function(users) {
        ONLINE.add(users);
    });
    
    socket.on('updateCount', function(data){
       localCount = data.count 
    });
    
    socket.on('removeDiv',function() {
        $('#passanchor').hide(500,function(){$('#passanchor').remove()});
    });

    socket.on('passverify', function() {
        $('head').append('<script src=\'https://www.google.com/recaptcha/api.js?\'></script>');
        $('body').append('<div id="passanchor"></div>');
        $('#passanchor').css('height','100%');
        $('#passanchor').css('width','100%');
        $('#passanchor').append('<div id="fader"></div>');
        $('#passanchor').append('<div id="captchaform"><div id="textfield">Please fill out this reCaptcha.</div><form id="captchaForm"><div class="g-recaptcha" data-sitekey="6LfJeQUTAAAAAJebE0KFgXJouTHfuBOOslMZlHqf"></div><br><input id = "submitButton" type="submit" value="Submit"></input></form></div>');
        $('#submitButton').on('click',function(e){
            e.preventDefault();
            socket.emit('passgood',{
                data : $('#captchaForm').serialize()
            });
        });
        $('#captchaform').css('top',window.innerHeight/3.25-39);
        $('#captchaform').css('left',window.innerWidth/2-152);
        $('#fader').animate({
                opacity: 0.6
            }, 700, function(){
                $('#captchaform').css('visibility','visible');
                setTimeout(function(){$('#captchaform').animate({opacity : 1.0}, 500); setTimeout(function(){addWarning()},2000);},700);
            }
        );
        function addWarning() {
            $('#passanchor').append('<div id="warning">Great. Now you have no way of verifying.</div>');
            $('#warning').css('top',window.innerHeight/3.25-9);
            $('#warning').css('left',window.innerWidth/2-129);
            $('#warning').css('visibility','visible');
        }
    });

    socket.on('left', function(user) {
        ONLINE.remove(user.id);
        if(user.part == undefined){
            CLIENT.show({
                type : 'general-message',
                message : user.nick + ' has left '
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
        if(info.role == 'mute'){
            info.role = 'basic'
            info.idle = 1
        }
        CLIENT.set(info);
    });
    
    socket.on('centermsg', function(data){
        $('#sam').remove()
        $('#messages').append("<table id=sam style='width:100%;'><tr><td style=text-align:center;vertical-align:middle;> " + parser.parse(data.msg) +"</td></tr><table>")
    	CLIENT.set({ msg : data.msg });
    });
    
    socket.on('alive', function(){
        socket.emit('alive')
    });
    
    socket.on('playvid', function(url){
        if(url.url == "stop" || CLIENT.get('mute') == 'on'){
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

    socket.on('connect', function() {
        if (!first) {
            //window.location.reload();
        }
        socket.emit('join', {
            nick : CLIENT.get('nick'),
            security : CLIENT.get('security')
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

    /*socket.on('updateMousePosition', function(msg) {
        CLIENT.trigger('updateMousePosition', msg);
    });*/
 
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
                lastNick = nick;
                var message = pm[2];
                return {
                    nick : nick,
                    message : message,
                }; 
            }
        } else if(name == 'block' || name == 'alert'){
            if (input.trim() != ""){
                add(name,input.trim());
            } else {
                CLIENT.show({
                    message : "Invalid: /"+name+" <nick>",
                    type : 'error-message'
                });
            }
        } else if(name == 'unblock' || name == 'unalert') {
            if (input.trim() != ""){
                remove(name.substring(2),input.trim());
            } else {
                CLIENT.show({
                    message : "Invalid: /"+name+" <nick>",
                    type : 'error-message'
                });
            }
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
        } else if(name == 'global') {
            var msg = /([\s\S]*)?$/.exec(input);
            return {
                message : msg[0]
            };
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
            'color font style mute mute_speak nick images security msg flair cursors styles bg access_level role part block alert menu_top menu_left menu_display mask frame'.split(' ').forEach(function(key) {
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
            'color font style flair mute mute_speak images cursors styles bg role access_level part mask frame'.split(' ').forEach(function(key) {
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
            var myrole = this.get('role');
            return myrole == null ? [] : _.filter(_.keys(COMMANDS), function(key) {
                var cmd_level = COMMANDS[key].role;
                return cmd_level == null || roles.indexOf(myrole) <= roles.indexOf(cmd_level);
            });
        },

        submit : function(input) {
            var role = this.get('role');
            var access_level = this.get('access_level');
            if (access_level >= 0) {
                var parsed = /^\/(\w+) ?([\s\S]*)/.exec(input);
                if (parsed) {
                    input = parsed[2];
                    var name = parsed[1].toLowerCase();
                    var cmd = COMMANDS[name];
                    if(cmd && !cmd.role){
                        cmd.role = 'basic'
                    }
                    if (cmd && roles.indexOf(role) <= (roles.indexOf(cmd.role) || 3)) {
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
                            message : 'Invalid command. Use /help for a list of commands.',
                            type : 'error-message'
                        });
                    }
                } else {
                    input = this.decorate(input);
                    if(!CLIENT.get('idle')){
                        socket.emit('message', {
                            flair : CLIENT.get('flair'),
                            message : input
                        });
                    } else {
                        CLIENT.show({
                            type : 'chat-message',
                            nick : CLIENT.get('nick'),
                            message : input,
                            flair : CLIENT.get('flair')
                        });
                     }
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
                    style = style.replace(/\/\+/g, '');
                    if(style.split('/^').length > 4){
                        amount = style.split('/^').length;
                        for (i = 0; i < amount - 4; i++) {
                            style = style.replace(/\/\^/i, '');
                        }
                    }
                    input = style + input;
                }
                input = ' ' + input;
                if (color) {
                    input = '#' + color + input + ' ';
                } else {
                    input = input + ' ';
                }
                if (font) {
                    input = '$' + font + '|' + input;
                }
            }
            return input;
        }

        /*updateMousePosition : function(position) {
            socket.emit('updateMousePosition', position);
        }*/
        
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
            if(message.message.search(check) != -1 || (message.type == 'personal-message' && message.nick != CLIENT.get('nick'))){
                $("#icon").attr("href","http://spooks.me/img/icon.ico");
            }
            unread++;
            updateTitle();
        }
    });
    CLIENT.on('change:notification', function(m, notification) {
        updateTitle();
        parser.getAllFonts(notification);
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
    CLIENT.on('change:frame_src', function(m) {
        var url = CLIENT.get('frame_src');
        if(CLIENT.get('frame') == 'on' && parser.linkreg.exec(url) && url != 'none'){
            $('#messages').append("<div class=frame><iframe width=\"100%\" height=\"100%\" src=\"" + url + "\"frameborder=\"0\" sandbox=\"allow-same-origin allow-scripts\"></iframe></div>")
        } else if(url == "none") {
            $(".frame").remove();
        }
    });
    CLIENT.on('change:frame', function(){
        if(CLIENT.get('frame') == 'off'){
            $(".frame").remove();
        } else {
            $('#messages').append("<div class=frame><iframe width=\"100%\" height=\"100%\" src=\"" + CLIENT.get('frame_src') + "\"frameborder=\"0\" sandbox=\"allow-same-origin allow-scripts\"></iframe></div>")
        }
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
    if (CLIENT.get('alert') == null){
        CLIENT.set('alert', ''); 
    }
    if (CLIENT.get('frame') == null){
        CLIENT.set('frame', 'on'); 
    }
    if (CLIENT.get('frame_src') == null){
        CLIENT.set('frame_src', ''); 
    }
});

// ------------------------------------------------------------------
// Theme
// ------------------------------------------------------------------

$(function() {
    CLIENT.on('change:background', function(m, background) {
        if (background && CLIENT.get('bg') == 'on' && background != 'default') {
            $('#messages').css('background', background);
            CLIENT.set('old', background);
        } else {
            CLIENT.set('old', background);
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
            $('#messages').css('background', 'url(/public/css/img/bg.png) center / auto 50% no-repeat rgb(17, 17, 17)');
        }
    });
    // scrollbar and input
    CLIENT.on('change:chat_style', function(m, style){
        style = CLIENT.get('chat_style').split(',');
        $('#input-bar').css('background-color', style[0]);
        if(navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
            document.styleSheets[1].deleteRule(9);
            document.styleSheets[1].insertRule(".scrollbar_default::-webkit-scrollbar-thumb { border-radius: 5px; background: " + style[1] + "",9);
        }
    });
});

// ------------------------------------------------------------------
// Online User Tracking
// ------------------------------------------------------------------

$(function() {
    function updateCount() {
        $('#tabbed-menu').text(ONLINE.size());
    }
    
    $('#tabbed-menu').click(function(){
        $('#user-list').slideToggle();
    });
    
    if(CLIENT.get('menu_display') != 'undefined'){
        $('.menu-container').css('left',CLIENT.get('menu_left'));
        $('.menu-container').css('top',CLIENT.get('menu_top'));
    }
    
    ONLINE.on('add', function(user) {
        var li = $('<li class="users"></li>').attr({
            class : 'online-' + user.get('id')
        }).appendTo('.online');
        var nick;
        if (user.get('nick').length > 35)
            nick = $('<span></span>').text(user.get('nick').substring(0,32)+'...').appendTo(li);
        else
            nick = $('<span></span>').text(user.get('nick')).appendTo(li);
        li.append(' ');
        user.on('change:nick', function() {
            if (user.get('nick').length > 35)
                nick.text(user.get('nick').substring(0,32)+'...');
            else
                nick.text(user.get('nick'));
        });
        CLIENT.on('change:menu_display', function(e) {
            //nothing for now
           updateCount();
        });
        updateCount();
    });
    ONLINE.on('remove', function(user) {
        $('.online-' + user.get('id')).remove();
        updateCount();
    });
    ONLINE.on('reset', function() {
        $('.online').html('');
    });
    $('#user-list').draggable({
        containment: '#messages',
        drag : function(){
            CLIENT.set('menu_left',$(this).css('left'));
            CLIENT.set('menu_top',$(this).css('top'));
        }
    }).resizable({ handles: "all" });
    
    $.contextMenu({
        selector: '.online li', 
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
                callback: function(){ CLIENT.submit('/kick '+ $.trim(this[0].textContent)) }
            },
            "Ban": {
                name: "Ban",
                callback: function(){ CLIENT.submit('/ban '+ $.trim(this[0].textContent)) }
            },
            "Banip": {
                name : "Banip",
                callback: function(){ CLIENT.submit('/banip '+ $.trim(this[0].textContent)) }
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
                callback: function(){ CLIENT.submit('/whois '+$.trim(this[0].textContent)) }
            }
        }
    });
    $('.online').click(function(e){
        $('.data-title').attr('data-menutitle', e.target.textContent);
    });
});

// ------------------------------------------------------------------
// Messages
// ------------------------------------------------------------------

$(function() {
    var animation = null;
    var roles = ['god','super','admin','mod','basic','mute'];
    
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
        var sound = 'message';
        message.type && el.addClass(message.type);
        var time = message.time ? new Date(message.time) : new Date();
        var check = new RegExp('\\b'+ CLIENT.get('nick') +'\\b',"gi");
        var alert = CLIENT.get('alert').split(',');
        var valid = false;
        for (i = 1; i < alert.length; i++) { 
            if(message.message.indexOf(' ' + alert[i] + ' ') != -1){
                valid = true;
            }
        }
        var content;
        if (message.type == 'general-message' || message.type == 'action-message'){
            message.count = message.count || localCount;
        }
        if (message.count){
            el.append($('<div class="timestamp" title=' + message.count + '></div>').text(time.format(DATE_FORMAT) + ' '));
            content = $('<div class="message-content spooky_msg_' + message.count + '"></div>').appendTo(el);
        } else {
            el.append($('<div class="timestamp"></div>').text(time.format(DATE_FORMAT) + ' '));
            content = $('<div class="message-content"></div>').appendTo(el);
        }
        if((check.test(message.message.replace('\\','')) || valid) && (message.nick != CLIENT.get('nick') && message.type == 'chat-message' || message.type == 'action-message' && message.message.split(' ')[0] != CLIENT.get('nick')) || (message.type == 'personal-message' && message.nick != CLIENT.get('nick'))){
            	message.count && el.children('.timestamp').attr('class', "timestamp highlightname");
            	sound = 'name'
        }
        if (message.message.search(/>>(\d)+/g) != -1) {
            for (var i = 0; i < message.message.match(/>>(\d)+/g).length; i++) {
                var lastMatch = message.message.match(/>>(\d)+/g)[i];
                    if ($('.spooky_msg_'+lastMatch.substring(2)).last().length > 0) {
                        var recurse = $('.spooky_msg_'+lastMatch.substring(2)).last().text();
                        var name = recurse.match(/[^:]*/i)[0];
                        if (name == CLIENT.get('nick') && CLIENT.get('nick') != message.nick) {
                            message.count && el.children('.timestamp').attr('class', "timestamp highlightname");
                            sound = 'name'
                        }
                    }
            }
        }
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
            if(message.hat != 'nohat' && message.type == 'chat-message'){
                $('<span class="hat ' + message.hat + '" style="background:url(\'/css/img/hats/'+message.hat+'.png\') no-repeat center;background-size: 30px 30px;"></span>').appendTo(content);
            }
            if (parsedFlair) {
                $('<span class="nick"></span>').html(parsedFlair + ':').appendTo(content);
            } else {
                $('<span class="nick"></span>').text(message.nick + ':').appendTo(content);
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
                parsed = parser.parse(message.message, true);
                break;
            case 'alert-message':
                parsed = parser.parse(message.message);
                break;
            case 'note-message':
                parsed = parser.parse(message.message);
                break; 
            case 'anon-message':
                if(CLIENT.get('role') == null || roles.indexOf(CLIENT.get('role')) >= 2){
                    parsed = parser.parse( '#6464C0' + 'anon' + ': ' + message.message);
                } else {
                    parsed = parser.parse( '#6464C0' + message.name + ': ' + message.message);
                }
                break;
            case 'error-message':
            	parsed = parser.parse(message.message);
            	break;
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

// get message
$( '#messages' ).on("click", ".message .timestamp", function(e) {
    var number = e.currentTarget.title;
    if (number != "") {
        var textBox = document.getElementById('input-message');
        if (textBox.value == '' || textBox.value.substring(textBox.value.length - 1) == ' '){
            textBox.value = textBox.value + '>>' + number + ' ';
        } else {
            textBox.value = textBox.value + ' >>' + number + ' ';
        }
        $('#input-message').focus();
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
                $('#bigimg').children().removeAttr('onload');
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
   $('#bigimg').children().removeAttr('onload');
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
            CLIENT.show({
                message : 'Available Commands: /' + CLIENT.getAvailableCommands().join(', /'),
                type : 'system-message'
            });
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
        logout : {},
        unregister : {},
        register : {
            params : [ 'initial_password' ]
        },
        change_password : {
            params : [ 'old_password', 'new_password' ]
        },
        banlist : {role : 'admin'},
        permabanlist : {role : 'admin'},
        find : {
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
        unban_all : {
            role : 'god'
        },
        banip : {
            role : 'admin',
            params : [ 'nick' ]
        },
        kick : {
            role : 'mod',
            params : [ 'nick[|message]' ]
        },
        access : {
            role : 'admin',
            params : [ 'role', 'access_level', 'nick$' ]
        },
        access_global : {
            role : 'god',
            params : [ 'access_level', 'nick$' ]
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
                    style = null;
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
        r : {
            params : [ 'message' ],
            handler : function(params){
                if (lastNick){
                    CLIENT.submit("/pm "+lastNick+"|"+params.message);
                } else {
                    CLIENT.show({
                        type : 'error-message',
                        message : 'You have not PMed anyone yet'
                    });
                }
            }
        },
        refresh : {role : 'super'},
        bg : {
            role : 'mod',
            params : [ 'theme_style$' ]
        },
        theme : {
            role : 'admin',
            params : [ 'input_style', 'scrollbar_style' ]
        },
        reset : {
            role : 'super',
            params : [ 'nick' ]
        },
        get : {
            params : [ 'attribute_name' ],
            handler : function(params) {
                var attribute_name = params.attribute_name;
                var valid = 'color font style flair mute mute_speak images note topic styles bg part block background mask msg alert security frame frame_src'.split(' ');
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
        afk : {},
        set : {
            params : [ 'att' ],
            handler : function(params) {
                var att = params.att;
                if (att == 'bg' && CLIENT.get('bg') == 'off'){
                    $('#background').css('background', CLIENT.get('old'));
                } 
                if(att != 'style' && att != 'font'){
                    CLIENT.set(att, CLIENT.get(att) == 'on' ? 'off' : 'on');
                }
            }
        },
        block : function(){},
        unblock : function(){},
        unblock_all : function(){
            CLIENT.set('block',"");
            CLIENT.show('Blocklist has been cleared');
        },
        alert : function(){},
        unalert : function(){},
        private : {
            role : 'super'
        },
        public : {
            role : 'super'
        },
        invite : {
            role : 'super',
            params : [ 'nick' ]
        },
        uninvite : {
            role : 'super',
            params : [ 'nick' ]
        },
        whitelist : {
            role : 'admin'
        },
        play : {
            role : 'super',
            params : [ 'url' ]
        },
        safe : function(){
            $('#messages').html(''),
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
        ghost : {role : 'super'},
        global : {
            role : 'super',
            params : [ 'message' ]
        },
        lock : {
            role : 'super',
            params : [ 'command', 'role', 'access_level' ]
        },
        user_list : {
            handler : function() {
                var admin = JSON.parse(CLIENT.get('access')),
                admins = [];
                for(var key in admin) {
                    if(admin[key].role == 'admin'){
                        admins.push(key);
                    }
                }
                CLIENT.show("admins : \n" + admins.join(','))
            }
        },
        frame : {
            role : 'super',
            params : [ 'url' ]
        }
    };

    COMMANDS.colour = COMMANDS.color;
    COMMANDS.background = COMMANDS.bg;
})();

var searchTerm;
add = function(att,user){
    block = CLIENT.get(att);
    searchTerm = new RegExp("(^|(?: ))" + user+"($|,+? )","i");
    if(block.search(searchTerm) == -1){
        block += ", " + user;
        while (block[0] == "," | block[0] == " ")
            block = block.substring(1);
        CLIENT.show(user + ' has been added');
        CLIENT.set(att,block);
    } else {
        CLIENT.show({
            message : 'That nick is already added',
            type : 'error-message'
        });
    }
}
remove = function(att,user){
    block = CLIENT.get(att);
    searchTerm = new RegExp("(^|(?: ))" + user+"($|,+? )","i");
    index = block.search(searchTerm);
    if(index != -1){
        if (block.split(",").length == 1){
            block = "";
        } else {
            block = block.substring(0,index-1) + block.substring(index+user.length+1);
            while (block[0] == "," | block[0] == " ")
                block = block.substring(1);
        }
        CLIENT.show(user + ' was removed.');
        CLIENT.set(att,block);
    } else {
        CLIENT.show({
            message : 'That nick is not on the list',
            type : 'error-message'
        });
    }
}

// ------------------------------------------------------------------
// Message Parser
// ------------------------------------------------------------------
var mouseX;
var mouseY;
parser = {
    linkreg : /(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?/i,
    coloreg : '(?:alice|cadet|cornflower|dark(?:slate)?|deepsky|dodger|light(?:sky|steel)?|medium(?:slate)?|midnight|powder|royal|sky|slate|steel)?blue|(?:antique|floral|ghost|navajo)?white|aqua|(?:medium)?aquamarine|azure|beige|bisque|black|blanchedalmond|(?:blue|dark)?violet|(?:rosy|saddle|sandy)?brown|burlywood|chartreuse|chocolate|(?:light)?coral|cornsilk|crimson|(?:dark|light)?cyan|(?:dark|pale)?goldenrod|(?:dark(?:slate)?|dim|light(?:slate)?|slate)?gr(?:a|e)y|(?:dark(?:olive|sea)?|forest|lawn|light(?:sea)?|lime|medium(?:sea|spring)|pale|sea|spring|yellow)?green|(?:dark)?khaki|(?:dark)?magenta|(?:dark)?orange|(?:medium|dark)?orchid|(?:dark|indian|(?:medium|pale)?violet|orange)?red|(?:dark|light)?salmon|(?:dark|medium|pale)?turquoise|(?:deep|hot|light)?pink|firebrick|fuchsia|gainsboro|gold|(?:green|light(?:goldenrod)?)?yellow|honeydew|indigo|ivory|lavender(?:blush)?|lemonchiffon|lime|linen|maroon|(?:medium)?purple|mintcream|mistyrose|moccasin|navy|oldlace|olive(?:drab)?|papayawhip|peachpuff|peru|plum|seashell|sienna|silver|snow|tan|teal|thistle|tomato|wheat|whitesmoke',
    replink : 'ÃƒÂ©ÃƒÂ¤!#@&5nÃƒÂ¸ÃƒÂºENONHEInoheÃƒÂ¥ÃƒÂ¶',
    repslsh : 'ÃƒÂ¸ÃƒÂº!#@&5nÃƒÂ¥ÃƒÂ¶EESCHEInoheÃƒÂ©ÃƒÂ¤',
    fontRegex : /\$([\w \-\,Ã‚Â®]*)\|(.*)$/,
    fonts : "ABeeZee,Abel,Abril Fatface,Aclonica,Acme,Actor,Adamina,Advent Pro,Aguafina Script,Akronim,Aladin,Aldrich,Alef,Alegreya,Alegreya Sans,Alegreya Sans SC,Alegreya SC,Alex Brush,Alfa Slab One,Alice,Alike,Alike Angular,Allan,Allerta,Allerta Stencil,Allura,Almendra,Almendra Display,Almendra SC,Amarante,Amaranth,Amatic SC,Amethysta,Amiri,Anaheim,Andada,Andika,Angkor,Annie Use Your Telescope,Anonymous Pro,Antic,Antic Didone,Antic Slab,Anton,Arapey,Arbutus,Arbutus Slab,Architects Daughter,Archivo Black,Archivo Narrow,Arimo,Arizonia,Armata,Artifika,Arvo,Asap,Asset,Astloch,Asul,Atomic Age,Aubrey,Audiowide,Autour One,Average,Average Sans,Averia Gruesa Libre,Averia Libre,Averia Sans Libre,Averia Serif Libre,Bad Script,Balthazar,Bangers,Basic,Battambang,Baumans,Bayon,Belgrano,Belleza,BenchNine,Bentham,Berkshire Swash,Bevan,Bigelow Rules,Bigshot One,Bilbo,Bilbo Swash Caps,Bitter,Black Ops One,Bokor,Bonbon,Boogaloo,Bowlby One,Bowlby One SC,Brawler,Bree Serif,Bubblegum Sans,Bubbler One,Buda,Buenard,Butcherman,Butterfly Kids,Cabin,Cabin Condensed,Cabin Sketch,Caesar Dressing,Cagliostro,Calligraffitti,Cambay,Cambo,Candal,Cantarell,Cantata One,Cantora One,Capriola,Cardo,Carme,Carrois Gothic,Carrois Gothic SC,Carter One,Caudex,Cedarville Cursive,Ceviche One,Changa One,Chango,Chau Philomene One,Chela One,Chelsea Market,Chenla,Cherry Cream Soda,Cherry Swash,Chewy,Chicle,Chivo,Cinzel,Cinzel Decorative,Clicker Script,Coda,Coda Caption,Codystar,Combo,Comfortaa,Coming Soon,Concert One,Condiment,Content,Contrail One,Convergence,Cookie,Copse,Corben,Courgette,Cousine,Coustard,Covered By Your Grace,Crafty Girls,Creepster,Crete Round,Crimson Text,Croissant One,Crushed,Cuprum,Cutive,Cutive Mono,Damion,Dancing Script,Dangrek,Dawning of a New Day,Days One,Dekko,Delius,Delius Swash Caps,Delius Unicase,Della Respira,Denk One,Devonshire,Dhurjati,Didact Gothic,Diplomata,Diplomata SC,Domine,Donegal One,Doppio One,Dorsa,Dosis,Dr Sugiyama,Droid Sans,Droid Sans Mono,Droid Serif,Duru Sans,Dynalight,Eagle Lake,Eater,EB Garamond,Economica,Ek Mukta,Electrolize,Elsie,Elsie Swash Caps,Emblema One,Emilys Candy,Engagement,Englebert,Enriqueta,Erica One,Esteban,Euphoria Script,Ewert,Exo,Exo 2,Expletus Sans,Fanwood Text,Fascinate,Fascinate Inline,Faster One,Fasthand,Fauna One,Federant,Federo,Felipa,Fenix,Finger Paint,Fira Mono,Fira Sans,Fjalla One,Fjord One,Flamenco,Flavors,Fondamento,Fontdiner Swanky,Forum,Francois One,Freckle Face,Fredericka the Great,Fredoka One,Freehand,Fresca,Frijole,Fruktur,Fugaz One,Gabriela,Gafata,Galdeano,Galindo,Gentium Basic,Gentium Book Basic,Geo,Geostar,Geostar Fill,Germania One,GFS Didot,GFS Neohellenic,Gidugu,Gilda Display,Give You Glory,Glass Antiqua,Glegoo,Gloria Hallelujah,Goblin One,Gochi Hand,Gorditas,Goudy Bookletter 1911,Graduate,Grand Hotel,Gravitas One,Great Vibes,Griffy,Gruppo,Gudea,Gurajada,Habibi,Halant,Hammersmith One,Hanalei,Hanalei Fill,Handlee,Hanuman,Happy Monkey,Headland One,Henny Penny,Herr Von Muellerhoff,Hind,Holtwood One SC,Homemade Apple,Homenaje,Iceberg,Iceland,IM Fell Double Pica,IM Fell Double Pica SC,IM Fell DW Pica,IM Fell DW Pica SC,IM Fell English,IM Fell English SC,IM Fell French Canon,IM Fell French Canon SC,IM Fell Great Primer,IM Fell Great Primer SC,Imprima,Inconsolata,Inder,Indie Flower,Inika,Irish Grover,Istok Web,Italiana,Italianno,Jacques Francois,Jacques Francois Shadow,Jim Nightshade,Jockey One,Jolly Lodger,Josefin Sans,Josefin Slab,Joti One,Judson,Julee,Julius Sans One,Junge,Jura,Just Another Hand,Just Me Again Down Here,Kalam,Kameron,Kantumruy,Karla,Karma,Kaushan Script,Kavoon,Kdam Thmor,Keania One,Kelly Slab,Kenia,Khand,Khmer,Khula,Kite One,Knewave,Kotta One,Koulen,Kranky,Kreon,Kristi,Krona One,La Belle Aurore,Laila,Lakki Reddy,Lancelot,Lateef,Lato,League Script,Leckerli One,Ledger,Lekton,Lemon,Libre Baskerville,Life Savers,Lilita One,Lily Script One,Limelight,Linden Hill,Lobster,Lobster Two,Londrina Outline,Londrina Shadow,Londrina Sketch,Londrina Solid,Lora,Love Ya Like A Sister,Loved by the King,Lovers Quarrel,Luckiest Guy,Lusitana,Lustria,Macondo,Macondo Swash Caps,Magra,Maiden Orange,Mako,Mallanna,Mandali,Marcellus,Marcellus SC,Marck Script,Margarine,Marko One,Marmelad,Martel Sans,Marvel,Mate,Mate SC,Maven Pro,McLaren,Meddon,MedievalSharp,Medula One,Megrim,Meie Script,Merienda,Merienda One,Merriweather,Merriweather Sans,Metal,Metal Mania,Metamorphous,Metrophobic,Michroma,Milonga,Miltonian,Miltonian Tattoo,Miniver,Miss Fajardose,Modak,Modern Antiqua,Molengo,Molle,Monda,Monofett,Monoton,Monsieur La Doulaise,Montaga,Montez,Montserrat,Montserrat Alternates,Montserrat Subrayada,Moul,Moulpali,Mountains of Christmas,Mouse Memoirs,Mr Bedfort,Mr Dafoe,Mr De Haviland,Mrs Saint Delafield,Mrs Sheppards,Muli,Mystery Quest,Neucha,Neuton,New Rocker,News Cycle,Niconne,Nixie One,Nobile,Nokora,Norican,Nosifer,Nothing You Could Do,Noticia Text,Noto Sans,Noto Serif,Nova Cut,Nova Flat,Nova Mono,Nova Oval,Nova Round,Nova Script,Nova Slim,Nova Square,NTR,Numans,Nunito,Odor Mean Chey,Offside,Old Standard TT,Oldenburg,Oleo Script,Oleo Script Swash Caps,Open Sans,Open Sans Condensed,Oranienbaum,Orbitron,Oregano,Orienta,Original Surfer,Oswald,Over the Rainbow,Overlock,Overlock SC,Ovo,Oxygen,Oxygen Mono,Pacifico,Paprika,Parisienne,Passero One,Passion One,Pathway Gothic One,Patrick Hand,Patrick Hand SC,Patua One,Paytone One,Peddana,Peralta,Permanent Marker,Petit Formal Script,Petrona,Philosopher,Piedra,Pinyon Script,Pirata One,Plaster,Play,Playball,Playfair Display,Playfair Display SC,Podkova,Poiret One,Poller One,Poly,Pompiere,Pontano Sans,Port Lligat Sans,Port Lligat Slab,Prata,Preahvihear,Press Start 2P,Princess Sofia,Prociono,Prosto One,PT Mono,PT Sans,PT Sans Caption,PT Sans Narrow,PT Serif,PT Serif Caption,Puritan,Purple Purse,Quando,Quantico,Quattrocento,Quattrocento Sans,Questrial,Quicksand,Quintessential,Qwigley,Racing Sans One,Radley,Rajdhani,Raleway,Raleway Dots,Ramabhadra,Ramaraja,Rambla,Rammetto One,Ranchers,Rancho,Ranga,Rationale,Ravi Prakash,Redressed,Reenie Beanie,Revalia,Ribeye,Ribeye Marrow,Righteous,Risque,Roboto,Roboto Condensed,Roboto Slab,Rochester,Rock Salt,Rokkitt,Romanesco,Ropa Sans,Rosario,Rosarivo,Rouge Script,Rozha One,Rubik Mono One,Rubik One,Ruda,Rufina,Ruge Boogie,Ruluko,Rum Raisin,Ruslan Display,Russo One,Ruthie,Rye,Sacramento,Sail,Salsa,Sanchez,Sancreek,Sansita One,Sarina,Sarpanch,Satisfy,Scada,Scheherazade,Schoolbell,Seaweed Script,Sevillana,Seymour One,Shadows Into Light,Shadows Into Light Two,Shanti,Share,Share Tech,Share Tech Mono,Shojumaru,Short Stack,Siemreap,Sigmar One,Signika,Signika Negative,Simonetta,Sintony,Sirin Stencil,Six Caps,Skranji,Slabo 13px,Slabo 27px,Slackey,Smokum,Smythe,Sniglet,Snippet,Snowburst One,Sofadi One,Sofia,Sonsie One,Sorts Mill Goudy,Source Code Pro,Source Sans Pro,Source Serif Pro,Special Elite,Spicy Rice,Spinnaker,Spirax,Squada One,Sree Krushnadevaraya,Stalemate,Stalinist One,Stardos Stencil,Stint Ultra Condensed,Stint Ultra Expanded,Stoke,Strait,Sue Ellen Francisco,Sunshiney,Supermercado One,Suranna,Suravaram,Suwannaphum,Swanky and Moo Moo,Syncopate,Tangerine,Taprom,Tauri,Teko,Telex,Tenali Ramakrishna,Tenor Sans,Text Me One,The Girl Next Door,Tienne,Timmana,Tinos,Titan One,Titillium Web,Trade Winds,Trocchi,Trochut,Trykker,Tulpen One,Ubuntu,Ubuntu Condensed,Ubuntu Mono,Ultra,Uncial Antiqua,Underdog,Unica One,UnifrakturCook,UnifrakturMaguntia,Unkempt,Unlock,Unna,Vampiro One,Varela,Varela Round,Vast Shadow,Vesper Libre,Vibur,Vidaloka,Viga,Voces,Volkhov,Vollkorn,Voltaire,VT323,Waiting for the Sunrise,Wallpoet,Walter Turncoat,Warnes,Wellfleet,Wendy One,Wire One,Yanone Kaffeesatz,Yellowtail,Yeseva One,Yesteryear,Zeyada".split(','),
    multiple : function(str, mtch, rep) {
        var ct = 0;
        while (str.match(mtch) != null && ct++ < 15)
            str = str.replace(mtch, rep);
        return str;
    },
    loadedFonts : {},
    addFont : function(family) {
        if (!this.loadedFonts[family] && this.fonts.indexOf(family) != -1) {
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
        var links = [];
        var prestr= "";
        var poststr = str;
        var index;
        while (poststr.search(/https?:\/\//i) != -1){
            index = poststr.search(/https?:\/\//i);
            prestr += poststr.substring(0, index);
            poststr = poststr.substring(index);
            if (poststr.search(this.linkreg) != -1){
                links.push(poststr.match(this.linkreg)[0]);
                poststr = poststr.replace(poststr.match(this.linkreg)[0],this.replink);
            } else {
                prestr += poststr.substring(0,poststr.match(/https?:\/\//i)[0].length);
                poststr = poststr.substring(poststr.match(/https?:\/\//i)[0].length);
            }
            str = prestr + poststr;
        }
        var escs = str.match(/\\./g);
        str = str.replace(/\\./g, this.repslsh);
        // replace escapes
        for (i in escs) {
            str = str.replace(this.repslsh, escs[i][1]);
        }
        // replace links
        if (links.length > 0) {
            for (var i = 0; i < links.length; i++) {
                link = links[i].replace(/^((.)(.+))$/, '$1');
                str = str.replace(this.replink, '<a target="_blank" href="' + link + '">' + link + '</a>');
            }
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
    parse : function(str, second) {
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
        var links = [];
        var prestr= "";
        var poststr = str;
        var index;
        while (poststr.search(/https?:\/\//i) != -1){
            index = poststr.search(/https?:\/\//i);
            prestr += poststr.substring(0, index);
            poststr = poststr.substring(index);
            if (poststr.search(this.linkreg) != -1){
                links.push(poststr.match(this.linkreg)[0]);
                poststr = poststr.replace(poststr.match(this.linkreg)[0],this.replink);
            } else {
                prestr += poststr.substring(0,poststr.match(/https?:\/\//i)[0].length);
                poststr = poststr.substring(poststr.match(/https?:\/\//i)[0].length);
            }
            str = prestr + poststr;
        }
        var escs = str.match(/\\./g);
        if (!second){
            str = str.replace(/\\./g, this.repslsh);
        }
        // replace underscores, et cetera
        if(CLIENT.get('styles') == 'on'){
         str = this.multiple(str, /\/\!!([^\|]+)\|?/g, '<div id=neon>$1</div>');
         str = this.multiple(str, /\/\&#35;([^\|]+)\|?/g, '<div id=spoil>$1</div>');
         str = this.multiple(str, /\/\++([^\|]+)\|?/g, '<div id=spinner>$1</div>');
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
        str = str.replace(/&gt;&gt;&gt;(\/[a-z0-9]+)\/(\d+)?\/?/gi, ' <a target="_blank" href="https://8ch.net$1/res/$2/">$&</a>');
        // if there's any links leading to 8ch.net/?/res/ (nothing
        // after /res/), trim them to just /?/
        str = str.replace(/https:\/\/8chan.co\/([a-z0-9]+)\/res\/"/gi, "https://8ch.net/$1/\"");
        // >>78 quote
        function scrollHTML(str1, str2){return '<a onmouseenter = "var quoteDiv = document.createElement(\x27div\x27); quoteDiv.setAttribute(\x27id\x27,\x27quoteDiv\x27); quoteDiv.setAttribute(\x27style\x27,\x27visibility:hidden\x27); setTimeout(function(){$(\x27#quoteDiv\x27).css(\x27visibility\x27,\x27visible\x27);},50); $(\x27#messages\x27).prepend(quoteDiv); $(\x27#quoteDiv\x27).css(\x27position\x27,\x27fixed\x27); $(\x27#quoteDiv\x27).css(\x27z-index\x27,\x275\x27); if (x == undefined){var x = $(document).mousemove(function(e){mouseX = e.pageX; mouseY = e.pageY})} if (quoteDiv != undefined){var msgClone = $(\x27.spooky_msg_'+str2+'\x27).last().parent().clone(); msgClone.children(\x27.message-content\x27).attr(\x27class\x27,\x27message-content msg_quote_'+str2+'\x27); msgClone.appendTo(\x27#quoteDiv\x27);}if ($(\x27#quoteDiv\x27).height() + mouseY + 49 < window.innerHeight){$(\x27#quoteDiv\x27).css({left:mouseX + 30,top:mouseY})}else{$(\x27#quoteDiv\x27).css({left:mouseX + 30,top:window.innerHeight - 49 - $(\x27#quoteDiv\x27).height()})}" onmousemove = "if ($(\x27#quoteDiv\x27).height() + mouseY + 49 < window.innerHeight){$(\x27#quoteDiv\x27).css({left:mouseX + 30,top:mouseY})}else{$(\x27#quoteDiv\x27).css({left:mouseX + 30,top:window.innerHeight - 49 - $(\x27#quoteDiv\x27).height()})}" onmouseout = "$(\x27#quoteDiv\x27).remove();" onclick = "$(\x27#messages\x27).animate({scrollTop: $(\x27.spooky_msg_'+str2+'\x27).last().offset().top - $(\x27#messages\x27).offset().top + $(\x27#messages\x27).scrollTop()},\x27normal\x27,function(){$(\x27.spooky_msg_'+str2+'\x27).last().animate({\x27background-color\x27:\x27rgb(255, 255, 255,0.8)\x27},400,function(){$(\x27.spooky_msg_'+str2+'\x27).last().animate({\x27background-color\x27:\x27transparent\x27},400)});});"><u>'+str1+'</u></a>';}
        function invalidHTML(str){return '<div style = "color: #AD0000">'+str+'</div>';}
        if (str.match(/(^| )&gt;&gt;[1-9]([0-9]+)?/) != null)
		str = str.replace(/(&gt;&gt;([1-9]([0-9]+)?))/gi, function(match,p1,p2){if(document.getElementsByClassName('spooky_msg_'+p2)[0] != null){return scrollHTML(p1,p2)}else{return invalidHTML(p1)}});
        // >implying
        str = str.replace(/^(&gt;.+)$/i, '&#35;789922 $1');
        str = str.replace(/^(&gt;.+)(\\n.+)$/i, '<div>&#35;789922 $1</div>$2');
        // >
        str = str.replace(/^(&gt;)$/i, '&#35;789922 $1');
        //JavaScript links
        str = str.replace(/(\/\?)([^\|]+)\|([^\|]+)\|?/gi, function(_, __, a, b){
            a = a.replace(/&#35;/gi, '#');
            if(/[^:]*javascript *:/im.test(a)) {
                    if (b.trim() == ""){
                    return '<div><a href="javascript:void(0)" title = "'+a+'" onclick = "'+a+'">' + '[JavaScript]' + '</a>&nbsp;<a onclick="window.prompt(&quot;The text is below&quot;,&quot;'+a+'&quot;);">[Copy]</a></div>';
                    }
                    return '<div><a href="javascript:void(0)" title = "'+a+'" onclick = "'+a+'">' + b.trim() + '</a>&nbsp;<a onclick="window.prompt(&quot;The text is below&quot;,&quot;'+a+'&quot;);">[Copy]</a></div>';
            } else {
                if (b.trim() == ""){
                return '<div><a href="javascript:void(0)" title = "'+a+'" onclick = "javascript: '+a+'">' + '[Script]' + '</a>&nbsp;<a onclick="window.prompt(&quot;The text is below&quot;,&quot;'+a+'&quot;);">[Copy]</a></div>';
                }
                return '<div><a href="javascript:void(0)" title = "'+a+'" onclick = "javascript: '+a+'">' + b.trim() + '</a>&nbsp;<a onclick="window.prompt(&quot;The text is below&quot;,&quot;'+a+'&quot;);">[Copy]</a></div>';
            }
        });
        //embed
        str = str.replace(/\/embed(\S*)(.*)/g, '<a target="_blank" href="$1">$1</a> <a target="_blank" onclick="video(\'\', \'embed\', \'$1\')">[embed]</a>');
        //colors
        str = this.multiple(str, /&#35;&#35;([\da-f]{6})(.+)$/i, '<span style="background-color: #$1;">$2</span>');
        str = this.multiple(str, /&#35;&#35;([\da-f]{3})(.+)$/i, '<span style="background-color: #$1;">$2</span>');
        str = this.multiple(str, /&#35;([\da-f]{6})([^;].*)$/i, '<span style="color: #$1;">$2</span>');
        str = this.multiple(str, /&#35;([\da-f]{3})([^;](?:..[^;].*|.|..|))$/i, '<span style="color: #$1;">$2</span>');
        str = this.multiple(str, RegExp('&#35;&#35;(' + this.coloreg + ')(.+)$', 'i'), '<span style="background-color: $1;">$2</span>');
        str = this.multiple(str, RegExp('&#35;(' + this.coloreg + ')(.+)$', 'i'), '<span style="color: $1;">$2</span>');
        str = this.multiple(str, this.fontRegex, '<span style="font-family:\'$1\'">$2</span>');
        // filters
        //original = ['you','matter','think','care','about','this','for','shit','nigger','nothing','out of','doesn\'t','doesnt','my','ask','question','you are','nice','trying to','black','rose','no ','fag ','faggot','what','too ','to ','guy','white','yes','mom','ing ','with','th','are ']
        //replace = ['u','matta','be thinkin','give a fuck','bout','dis','fo','shiznit','nigga','nuttin','outa','don\'t','dont','muh','axe','queshon','yo ass is','dank','tryna','nigga','flowa','naw ','homo ','homo','whut','2 ','2 ','nigga','cracka','ye','mama','in ','wit','d','r ']
        //for (i = 0; i < original.length; i++) { 
        //   if(str.indexOf(original[i]) != -1){
        //        str = str.replace(original[i],replace[i])
        //   }
        //}
        // replace escapes
        for (i in escs) {
            str = str.replace(this.repslsh, escs[i][1]);
        }
        // replace links
        if (links.length > 0) {
            for (var i = 0; i < links.length; i++) {
                link = links[i].replace(/^((.)(.+))$/, '$1');
                str = str.replace(this.replink, '<a target="_blank" href="' + link + '">' + link + '</a>');
            }
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
    /*var position = null, x, y;
    $(window).mousemove(function(e) {
        x = e.clientX / $(window).width();
        y = e.clientY / $(window).height();
    });

    setInterval(function() {
        if (CLIENT.get('cursors') == 'off' ? 0 : 1 && !position || position.x != x || position.y != y) {
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
            if (user) {
                var nick = $('<span class="nick"></span>').text(user.get('nick'));
                el = $('<div id="cursor-' + msg.id + '" class="mouseCursor"></div>').append(nick).appendTo('body');
                el.css('display', CLIENT.get('cursors') == 'off' ? 'none' : 'block');
                user.on('change:nick', function(m, newNick) {
                    nick.text(newNick);
                });
            }
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
    });*/
});

