var _ = require('underscore');
var fs = require('fs');
var settings;

try {
    var file = fs.readFileSync('./conf/settings.json');
    settings = JSON.parse(file.toString());
} catch (e) {
    throw new Error('Invalid settings: /conf/settings.json invalid or does not exist');
}

module.exports = {
    server : {
        port : 80,
        compression : true,
        cache : false
    // 86400000
    },

    https : {
        domain : 'awakens.me',
        key : './ssl/myserver.key',
        cert : './ssl/server.crt',
        port : 443
    },

    speak : {
        0 : 1,
        1 : 1,
        2 : {
            time : 10000,
            max : 1
        },
        'default' : {
            time : 20000,
            max : 1
        }
    },

    throttle : {
        updateMousePosition : {
            errorMessage : false,
            user : {
                time : 1000,
                max : 100
            },
            channel : {
                time : 1000,
                max : 500
            },
            global : {
                time : 1000,
                max : 1000
            },
            banned : {
                limits : []
            }
        },
        'default' : {
            errorMessage : true,
            user : {
                time : 1000,
                max : 2
            },
            channel : {
                time : 1000,
                max : 10
            },
            global : {
                time : 1000,
                max : 20
            },
            banned : {
                limits : [ {
                    time : 1000,
                    max : 5
                }, {
                    time : 60 * 1000,
                    max : 20
                } ],
                unban : 5 * 60 * 1000
            }
        }
    },

    password : {
        iterations : 1000
    },

    emailRegex : /^[_A-Za-z0-9-\+]+(\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\.[A-Za-z0-9]+)*(\.[A-Za-z]{2,})$/,

    db : {
        host : 'localhost',
        schema : 'nodejs_chat'
    },

    log : {
        error : true,
        info : true,
        debug : false,
        db : false
    },

    registrationEmail : {
        from : 'Chat Server <donotreply@awakens.me>',
        subject : 'Registering Chat Nickname',
        text : 'You are registering the nickname {0}.\r\nTo verify your account, all you have to do is type out the following: /verify {1}'
    },

    limits : {
        message : 5000,
        nick : 100,
        spoken : 250,
        part : 140
    },

    // emailServer : {
    // user : "username",
    // password : "password",
    // host : "smtp.your-email.com",
    // ssl : true
    // },

    msgs : {
        get : function(key) {
            var value = this[key];
            if (value) {
                for ( var i = 1; i < arguments.length; i++) {
                    value = value.replace('{' + (i - 1) + '}', arguments[i]);
                }
            }
            return value;
        },

        banned : 'You are banned',
        banned_by : 'You have been banned by: {0}',
        banned_reason : 'You have been banned by: {0}, Reason {1}',
        kicked : 'You have been kicked by: {0}',
        kicked_reason : 'You have been kicked by: {0}, Reason: {1}',
        ghosted: 'Someone else logged in using your username',
        pmOffline : 'Cannot PM a nick unless they are online',
        notRegistered : 'Not registered yet',
        alreadyRegistered : 'Already registered',
        alreadyVerified : 'Already verified',
        invalidCode : 'The verification code provided was incorrect',
        invalidPassword : 'Invalid password',
        invalidEmail : 'Invalid email address',
        invalidAccess : 'Invalid access_level',
        invalidCommand : 'Invalid command',
        invalidCommandParams : 'Invalid command parameters',
        invalidCommandAccess : 'You do not have the required permission for this command',
        invalidLogin : 'The password you provided was incorrect',
        nickVerified : 'The nick has been taken, please use /login instead',
        nickNotVerified : 'You cannot login to a nick that was not registered or verified',
        change_password_login : 'You must register before you can change the password',
        alreadyBeingUsed : 'That nick is already being used by someone else',
        verified : 'You have verified the nick',
        registered : 'You have registered the nick',
        registeredAndVerified : 'Your nick was registered. Please verify the nick.',
        unregistered : 'You have unregistered the nick',
        banlist : 'Globally banned: {0}',
        channel_banlist : 'Channel banned: {0}',
        access_granted : 'User {0} now has level {1}',
        whoami : 'You are {0} with role {1} with access_level {2} with ip {3}',
        whois : '{0} \nRole: {1}\nLevel: {2}\nIP: {3}\nMask: {4}\nUser ID: {5}',
        whoiss : '{0} ({4}) \nRole: {1}\nLevel: {2}\nIP: {3}',
        user_doesnt_exist : '{0} does not exist',
        find_ip : 'ip {0} uses: {1}',
        find_ip_empty : 'Could not find ip {0}',
        banned_channel : '{0} is now banned on this channel',
        banned_global : '{0} is now banned globally',
        unbanned_channel : '{0} is no longer banned on this channel',
        unbanned_global : '{0} is no longer banned globally',
        not_banned_channel : '{0} is not banned on this channel',
        not_banned_global : '{0} is not banned globally',
        already_banned_channel : '{0} is already banned on this channel',
        already_banned_global : '{0} is already banned globally',
        banned_file : '{0} is banned in a file and cannot be unbanned',
        no_banned_channel : 'There is nothing banned on this channel',
        no_banned_global : 'There is nothing banned globally',
        reset_user : '{0} has been reset',
        change_password : 'You have changed your password',
        enterSamePassword : 'Please enter the same password that you did when you registered',
        oldPasswordWrong : 'Your old password is not correct',
        user_exist_not_registered : '{0} exists but is not registered',
        throttled : 'Either you are doing that too much, or the site is under too much load',
        temporary_ban : 'You are way too fast, you have been banned for a while, try again later',
        muted : 'You have been muted, please try again later',
        registeredName : 'That nick is already registered',
        vhosttaken : '{0} has already been taken as a mask',
        InvalidCharacters : 'Name contained invalid character(s)',
        clear_channel : '{0} has cleared the banlist',
        same_topic : 'That is already the topic',
        alone : 'There is nobody online...'
    },

    nouns : [ 'alien', 'apparition', 'bat', 'blood', 'bogeyman', 'boogeyman', 'boo', 'bone', 'cadaver', 'casket', 'cauldron', 'cemetery', 'cobweb', 'coffin', 'corpse', 'crypt', 'darkness', 'dead', 'demon', 'devil', 'death', 'eyeball', 'fangs', 'fear', 'gastly', 'gengar', 'ghost', 'ghoul', 'goblin', 'grave', 'gravestone', 'grim', 'grimreaper', 'gruesome', 'haunter', 'headstone', 'hobgoblin', 'hocuspocus', 'howl', 'jack-o-lantern', 'mausoleum', 'midnight', 'monster', 'moon', 'mummy', 'night', 'nightmare', 'ogre', 'phantasm', 'phantom', 'poltergeist', 'pumpkin', 'scarecrow', 'scream', 'shadow', 'skeleton', 'skull', 'specter', 'spider', 'spine', 'spirit', 'spook', 'tarantula', 'tomb', 'tombstone', 'troll', 'vampire', 'werewolf', 'witch', 'witchcraft', 'wraith', 'zombie' ],

    adjectives : [ 'bloodcurdling', 'chilling', 'creepy', 'dark', 'devilish', 'dreadful', 'eerie', 'evil', 'frightening', 'frightful', 'ghastly', 'ghostly', 'ghoulish', 'gory', 'grisly', 'hair-raising', 'haunted', 'horrible', 'macabre', 'morbid', 'mysterious', 'otherworldly', 'repulsive', 'revolting', 'scary', 'shadowy', 'shocking', 'spine-chilling', 'spooky', 'spoopy', 'startling', 'supernatural', 'terrible', 'unearthly', 'unnerving', 'wicked' ],

};

_.each(settings, function(setting, key) {
    var override = module.exports[key];
    if (override) {
        if (setting) {
            _.extend(override, setting);
        } else {
            module.exports[key] = null;
        }
    } else {
        module.exports[key] = setting;
    }
});
