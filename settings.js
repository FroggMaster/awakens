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
        port : 8080,
        compression : true,
        cache : false
    // 86400000
    },

    https : {
        domain : 'this.spooks.me',
        key : './ssl/localhost.key',
        cert : './ssl/localhost.crt',
        port : 8443
    },

    speak : {
        0 : null,
        1 : null,
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
        from : 'Chat Server|No-reply <thisspoopsme@gmail.com>',
        subject : 'Registering Chat Nickname',
        text : 'You are registering the nickname {0}.\r\nTo verify your account, all you have to do is type out the following: /verify <password> {1}'
    },

    limits : {
        message : 10000,
        nick : 100,
        spoken : 100,
        part : 140
    },

    emailServer : {
    user : "thisspoopsme@gmail.com",
    password : "askkryforpassword",
    host : "smtp.gmail.com",
    ssl : true
    },

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

        banned : 'You are banned.',
        kicked: 'You have been kicked By: {0}',
        kicked_reason: 'You have been kicked By: {1}, Reason: {0}',
        ghosted: 'Someone else logged in using your username.',
        pmOffline : 'Cannot pm a nick unless they are online.',
        notRegistered : 'Not registered yet',
        alreadyRegistered : 'Already registered',
        alreadyVerified : 'Already verified',
        invalidCode : 'The verification code provided was incorrect',
        invalidPassword : 'Invalid password',
        invalidEmail : 'Invalid email address',
        invalidAccess : 'Invalid access_level',
        invalidCommand : 'Invalid command',
        invalidCommandParams : 'Invalid command parameters',
        invalidCommandAccess : 'Not permissioned for this command',
        invalidLogin : 'The password you provided was incorrect',
        nickVerified : 'The nick has been taken, please use /login instead',
        nickNotVerified : 'You cannot login to a nick that was not registered or verified',
        change_password_login : 'You must register before you can change the password',
        alreadyBeingUsed : 'That nick is already being used by someone else',
        verified : 'You have verified the nick',
        registered : 'You have registered the nick, Please check your email',
        registeredAndVerified : 'Your nick was registered. Please verify the nick by typing /verify (your password here)',
        unregistered : 'You have unregistered the nick',
        banlist : 'Globally banned: {0}',
        channel_banlist : 'Channel banned: {0}',
        access_granted : 'User {0} now has level {1}',
        whoami : 'You are {0} with role {1} with access_level {2} with ip {3}',
        whois : '{0} has role {1} with access_level {2} with ip {3} and is {4}',
        whoiss : '{0} has role {1}',
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
        muted : 'You have been muted, please try again later.',
        registeredName : 'That nick is registered'
    },

    names : [ "Arthur", "ARX", "MOS", "RISC iX", "RISC OS", "AmigaOS", "Amiga Unix", "Apple DOS", "Apple Pascal", "ProDOS", "GS/OS", "Apple SOS", "Lisa Workshop", "LisaOS", "Mac OS", "Rhapsody", "NeXTSTEP", "OS X", "IBM AIX", "Newton OS", "iOS", "A/ROSE", "NetBSD", "Atari DOS", "Atari TOS", "XTS400", "BeOS", "UNIX", "MINI-UNIX", "BESYS", "Plan 9", "GCOS", "COS", "MACE", "KronOS", "NOS", "SCOPE", "SPIRO", "AOS", "RDOS", "CTOS", "HeartOS", "CP/M", "MP/M", "FlexOS", "CCI DOS", "Datapac", "DOS Plus", "Novell DOS", "HP-UX", "NonStop", "OS/8", "Ultrix", "Towns OS", "ChromeOS", "Chromium", "Android", "INTEGRITY", "HDOS", "HT-11", "Multics", "iRMX", "BESYS", "CTSS", "OS/360", "LynxOS", "MicroC/OS-III", "Xenix", "MSX-DOS", "MS-DOS", "Windows 1.0", "Windows 2.0", "Windows 3.0", "Windows 3.1", "Windows 3.2", "Windows 95", "Windows 98", "Windows Millenium Edition", "Windows NT 3.1", "Windows NT 3.5", "Windows NT 3.51", "Windows NT 4.0", "Windows 2000", "Windows XP", "Windows Vista", "Windows 7", "Windows 8", "Windows 8.1", "Windows 10", "Windows Phone 8", "Midori", "Netware", "Bada", "Tizen", "PikeOS", "TRS-DOS", "TRON", "EXEC I", "WPS", "Xerox", "Aegis", "Minix", "FreeBSD", "BSD", "PC-DOS", "Solaris", "JarisOS", "Tunis", "ILIOS", "FreeDOS", "Ubuntu", "Mint", "Arch", "Slackware", "Manjaro", "Debian", "Knoppix", "Kubuntu", "Xubuntu", "Lubuntu", "SteamOS", "Fedora", "CentOS", "Mandriva", "Gentoo", "openSUSE", "PClinuxOS", "Atomix" ]
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
