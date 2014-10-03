var settings = require('./settings');
var email = require('./sendEmail');
var msgs = settings.msgs;
var _ = require('underscore');
var $ = require('jquery-deferred');
var mysql = require('mysql');
var passwordHash = require('password-hash');
var fs = require('fs');
var pool = mysql.createPool(settings.db);

module.exports = function(callback) {
    var connection = $.Deferred();

    /**
     * @inner
     * @param {Object} info The user info from db
     * @return {Object}
     */
    function User(info) {
        return {
            /**
             * Get a user attribute.
             * 
             * @param {string} attr
             * @returns {*}
             */
            get : function(attr) {
                return info[attr];
            },

            /**
             * Set a user attribute.
             * 
             * @param {string|Object} values or key
             * @param {*=} value
             * @returns {$.Promise}
             */
            set : function(values) {
                if (typeof values == 'string') {
                    var key = values;
                    values = {};
                    values[key] = arguments[1];
                }
                var params = [];
                var setters = [];
                for ( var key in values) {
                    var value = values[key];
                    if (info[key] != value) {
                        params.push(value);
                        setters.push(key + '=?');
                    }
                }
                params.push(info.nick);
                if (setters.length > 0) {
                    var sql = 'update chat_users set ' + setters.join(', ') + ' where nick=?';
                    return query(sql, params).then(function() {
                        return findUser(values.nick || info.nick).then(function(user) {
                            if (user) {
                                _.keys(info).forEach(function(key) {
                                    info[key] = user.get(key);
                                });
                                return $.Deferred().resolve();
                            } else {
                                // Should never happnen
                                return $.Deferred().reject('User not found after update!');
                            }
                        });
                    });
                } else {
                    return $.Deferred().resolve();
                }
            },

            /**
             * Register this user.
             * 
             * @param {string} email_address
             * @param {string=} initial_password
             * @returns {$.Promise}
             */
            register : function(email_address, initial_password) {
                var err;
                if (!notEmptyString(email_address) || !settings.emailRegex.test(email_address)) {
                    err = msgs.invalidEmail;
                } else if (info.registered) {
                    err = msgs.alreadyRegistered;
                } else if (settings.emailServer) {
                    var _this = this;
                    var verification_code = Math.floor(Math.random() * 10000);
                    var emailContent = _.extend({
                        to : 'Spooks Chatter <' + email_address + '>'
                    }, settings.registrationEmail);
                    var emailParams = {
                        text : [ this.get('nick'), verification_code ]
                    };
                    return email.send(emailContent, emailParams).then(function() {
                        return _this.set({
                            registered : 1,
                            email_address : email_address,
                            verification_code : verification_code,
                            pw_hash : passwordHash.generate(initial_password)
                        }).then(function() {
                            return $.Deferred().resolve(true, msgs.registered);
                        });
                    });
                } else {
                    return this.set({
                        registered : 1,
                        email_address : email_address,
                        pw_hash : passwordHash.generate(initial_password)
                    }).then(function() {
                        return $.Deferred().resolve(true, msgs.registeredAndVerified);
                    });
                }
                return $.Deferred().resolve(false, err);
            },

            /**
             * Verify this user.
             * 
             * @param {number} verification_code
             * @param {string} password
             * @returns {$.Promise}
             */
            verify : function(password, verification_code) {
                var err;
                if (!info.registered) {
                    err = msgs.notRegistered;
                } else if (info.verified) {
                    err = msgs.alreadyVerified;
                } else if (settings.emailServer && info.verification_code != verification_code) {
                    err = msgs.invalidCode;
                } else if (!this.verifyPassword(password)) {
                    err = msgs.enterSamePassword;
                } else if (!notEmptyString(password)) {
                    err = msgs.invalidPassword;
                } else {
                    return this.set({
                        verified : 1,
                        verification_code : null,
                        pw_hash : passwordHash.generate(password)
                    }).then(function() {
                        return $.Deferred().resolve(true, msgs.verified);
                    });
                }
                return $.Deferred().resolve(false, err);
            },

            /**
             * Unregister this user.
             * 
             * @returns {$.Promise}
             */
            unregister : function() {
                if (info.registered) {
                    return this.set({
                        access_level : 3,
                        registered_on : null,
                        registered : 0,
                        verified : 0,
                        verification_code : null,
                        email_address : null,
                        pw_hash : null
                    }).then(function() {
                        return $.Deferred().resolve(true, msgs.unregistered);
                    });
                } else {
                    return $.Deferred().resolve(false, msgs.notRegistered);
                }
            },

            /**
             * Verify the given password.
             * 
             * @param {string} password
             * @returns {boolean}
             */
            verifyPassword : function(password) {
                return info.pw_hash && passwordHash.verify(password, info.pw_hash);
            },

            /**
             * Change the password.
             * 
             * @return {$.Promise}
             */
            change_password : function(old_password, new_password) {
                var err;
                if (!this.get('verified')) {
                    err = msgs.change_password_login;
                } else if (!this.verifyPassword(old_password)) {
                    err = msgs.oldPasswordWrong
                } else {
                    return this.set({
                        pw_hash : passwordHash.generate(new_password)
                    }).then(function() {
                        return $.Deferred().resolve(true, msgs.change_password);
                    });
                }
                return $.Deferred().resolve(false, err);
            },

            /**
             * 
             * @param {string} access_level
             * @returns {$.Promise}
             */
            access : function(role, access_level) {	
				this.set('role', role)
                    access_level = new Number(access_level);
                    if (!isNaN(access_level) && access_level >= 0 && access_level <= 4) {
                        access_level = access_level + "";
                        var nick = this.get('nick');
                        return this.set('access_level', access_level,'role', role).then(function() {
                            return $.Deferred().resolve(true, msgs.get('access_granted', nick, role, access_level));
                        });
                    } else {
                        return $.Deferred().resolve(false, msgs.invalidAccess);
                    } 
            }
        };
    }

    /**
     * @inner
     * @param {string} sql
     * @param {Array.<string>} params
     * @returns {$.Promise<Array<Object>>}
     */
    function query(sql, params) {
        var rows = $.Deferred();
        connection.then(function(db) {
            if (settings.log.db) {
                console.log('Query request: ' + sql, params);
            }
            db.query(sql, params, function(err, dbrows) {
                try {
                    if (err) {
                        if (settings.log.error) {
                            console.error('Query error: ', err);
                        }
                        rows.reject(err);
                    } else {
                        if (settings.log.db) {
                            console.log('Query resolved: ', JSON.stringify(dbrows));
                        }
                        rows.resolve(dbrows);
                    }
                } catch (err) {
                    settings.log.error && console.error(err, err.stack);
                }
            });
        }, function(err) {
            rows.reject(err);
        });
        return rows.promise();
    }

    /**
     * @inner
     * @param {string} sql
     * @param {Array.<string>} params
     * @returns {$.Promise<Object>}
     */
    function one(sql, params) {
        return query(sql, params).then(function(rows) {
            return rows && rows.length > 0 ? rows[0] : null;
        });
    }

    /**
     * @inner
     * @param {string} nick
     * @returns {$.Promise<User>}
     */
    function findUser(nick) {
        if (notEmptyString(nick)) {
            return one('select * from chat_users where nick=?', [ nick ]).then(function(info) {
                return info ? User(info) : null;
            });
        } else {
            return $.Deferred().reject('Invalid nick');
        }
    }

    /**
     * @inner
     * @param {string} str
     * @returns {boolean}
     */
    function notEmptyString(str) {
        return typeof str == 'string' && str;
    }

    pool.getConnection(function(err, dbconn) {
        if (err) {
            settings.log.error && console.error('Could not establish connection: ' + err);
            connection.reject(err);
        } else if (dbconn) {
            dbconn.query('use ' + settings.db.schema);
            try {
                connection.resolve(dbconn);
            } catch (err) {
                settings.log.error && console.error(err, err.stack);
            }
            settings.log.db && console.log('Database connection established');
        } else {
            settings.log.error && console.error('No connection');
            connection.reject('No connection');
        }
    });

    var dao = {
        /**
         * Create a user.
         * 
         * @param {string} nick
         * @param {string} remote_addr
         * @returns {$.Promise<User>}
         */
        createUser : function(nick, remote_addr) {
            var user = $.Deferred();
            if (!notEmptyString(nick)) {
                user.reject('Invalid nick');
            } else if (!notEmptyString(remote_addr)) {
                user.reject('Invalid remote_addr');
            } else {
                query('insert into chat_users (nick, remote_addr, access_level) values(?,?,3)', [ nick, remote_addr ]).then(function() {
                    findUser(nick).then(function(fuser) {
                        if (fuser) {
                            user.resolve(fuser);
                        } else {
                            console.error('User could not be found after creation');
                            user.reject();
                        }
                    }, function(err) {
                        user.reject(err);
                    });
                }, function(err) {
                    user.reject(err);
                });
            }
            return user.promise();
        },

        /**
         * Find a user.
         * 
         * @param {string} nick
         * @returns {$.Promise.<User>}
         */
        findUser : function(nick) {
            return findUser(nick);
        },

        /**
         * @param {string} channel
         * @param {string} remote_addr
         * @param {string=} nick
         * @returns {boolean}
         */
        isBanned : function(channel, remote_addr, nick) {
            if (this.isFileBanned(remote_addr) || this.isFileBanned(nick)) {
                return $.Deferred().resolve(true).promise();
            }
            var sql = 'select banned from chat_banned where (channel=? or channel is null) and ';
            var params = [ channel, remote_addr ];
            if (nick) {
                sql += '(banned=? or banned=?)';
                params.push(nick);
            } else {
                sql += 'banned=?';
            }
            return one(sql, params).then(function(row) {
                return !!row;
            });
        },

        /**
         * @returns {Array.<string>}
         */
        getFileBanList : function() {
            var banned = fs.readFileSync('banned.txt');
            if (banned) {
                return _.filter(banned.toString().split(/[\s,\n\r]+/), function(id) {
                    return id.length > 0;
                });
            }
            return [];
        },

        /**
         * @param {string} remote_addr
         * @param {string} nick
         * @returns {Boolean}
         */
        isFileBanned : function(banned_id) {
            if (banned_id) {
                var banned = this.getFileBanList();
                return _.any(banned, function(id) {
                    return banned_id.indexOf(id) == 0;
                });
            }
            return false;
        },

        /**
         * @param {string} banned
         * @param {string} channel
         * @returns {$.Promise<boolean>}
         */
        isChannelBanned : function(banned, channel) {
            var sql = 'select banned from chat_banned where banned=? and channel';
            var params = [ banned ];
            if (channel != null) {
                sql += '=?';
                params.push(channel);
            } else {
                sql += ' is null';
            }
            return one(sql, params).then(function(row) {
                return !!row;
            });
        },

        /**
         * @param {string} banned
         * @param {string=} channel
         * @returns {$.Promise}
         */
        ban : function(banned, channel) {
            var result = $.Deferred();
            this.isChannelBanned(banned, channel).then(function(isbanned) {
                if (isbanned) {
                    result.resolve(false, msgs.get(channel != null ? 'already_banned_channel' : 'already_banned_global', banned));
                } else {
                    var sql = 'insert into chat_banned (banned, channel) values (?,';
                    var params = [ banned ];
                    if (channel != null) {
                        params.push(channel);
                        sql += '?)';
                    } else {
                        sql += 'null)';
                    }
                    query(sql, params).then(function() {
                        result.resolve(true, msgs.get(channel != null ? 'banned_channel' : 'banned_global', banned));
                    }, function(err) {
                        result.reject(err);
                    });
                }
            }, function(err) {
                result.reject(err);
            });
            return result.promise();
        },

        /**
         * @param {string} banned
         * @param {string=} channel
         * @returns {$.Promise}
         */
        unban : function(banned, channel) {
            var result = $.Deferred();
            if (this.isFileBanned(banned)) {
                result.resolve(false, msgs.get('banned_file', banned));
            } else {
                this.isChannelBanned(banned, channel).then(function(isbanned) {
                    if (isbanned) {
                        var sql = 'delete from chat_banned where banned=? and channel';
                        var params = [ banned ];
                        if (channel != null) {
                            params.push(channel);
                            sql += '=?';
                        } else {
                            sql += ' is null';
                        }
                        query(sql, params).then(function() {
                            result.resolve(true, msgs.get(channel != null ? 'unbanned_channel' : 'unbanned_global', banned));
                        }, function(err) {
                            result.reject(err);
                        });
                    } else {
                        result.resolve(false, msgs.get(channel != null ? 'not_banned_channel' : 'not_banned_global', banned));
                    }
                }, function(err) {
                    result.reject(err);
                });
            }
            return result.promise();
        },

        /**
         * @param {string} channel
         * @returns {$.Promise<Array.<string>>}
         */
        banlist : function(channel) {
            var sql = 'select banned from chat_banned where channel';
            var params = [];
            if (channel != null) {
                params.push(channel);
                sql += '=?';
            } else {
                sql += ' is null';
            }
            var _this = this;
            return query(sql, params).then(function(rows) {
                var result = rows ? _.map(rows, function(row) {
                    return row.banned;
                }) : [];
                if (channel == null) {
                    result = result.concat(_.map(_this.getFileBanList(), function(id) {
                        return id + '.*';
                    }));
                }
                return result;
            });
        },

        /**
         * @param {string} remote_addr
         * @returns {$.Promise<Array.<string>>}
         */
        find_ip : function(remote_addr) {
            return query('select nick from chat_users where remote_addr=?', [ remote_addr ]).then(function(rows) {
                return rows ? _.map(rows, function(row) {
                    return row.nick;
                }) : [];
            });
        },

        /**
         * @param {string} channel
         * @returns {$.Promise<Object>}
         */
        getChannelInfo : function(channel) {
            return query('select info_key, value from chat_channel_info where channel=?', [ channel ]).then(function(rows) {
                var info = {};
                rows && rows.forEach(function(row) {
                    info[row.info_key] = row.value;
                });
                return info;
            });
        },

        /**
         * @param {string} channel
         * @param {Object|string} info or key
         * @param {string=} value
         * @return {$.Promise}
         */
        setChannelInfo : function(channel, info) {
            var done = $.Deferred();
            if (typeof info == 'string') {
                var key = info;
                info = {};
                info[key] = arguments[2];
            }
            var dvalues = [];
            var dparams = [ channel ];
            var ivalues = [];
            var iparams = [];
            _.each(info, function(value, key) {
                dvalues.push('?');
                dparams.push(key);
                iparams.push(channel, key, value);
                ivalues.push('(?,?,?)');
            });
            if (dvalues.length > 0) {
                query('delete from chat_channel_info where channel=? and info_key in (' + dvalues.join(',') + ')', dparams).then(function() {
                    query('insert into chat_channel_info (channel,info_key,value) values ' + ivalues.join(' '), iparams).then(function() {
                        done.resolve();
                    }, function(err) {
                        done.reject(err);
                    });
                }, function(err) {
                    done.reject(err);
                });
            } else {
                done.resolve();
            }
            return done.promise();
        },

        /**
         * @returns {$.Promise<string>}
         */
        nextNick : function() {
            return one('select count(*) count from chat_users').then(function(row) {
                return _.sample(settings.names) + '.' + row.count;
            });
        },

        release : function() {
            connection.done(function(dbconn) {
                dbconn.release();
                settings.log.db && console.log('DB Connection released');
            });
        }
    };

    if (typeof callback == 'function') {
        callback(dao);
    }

    return dao;
};
