/**
 * @overview: Check password with passwords stored in dovecot format in postgresql
 *
 * @author : Michael Bruderer
 * @version 2016/01/29
 */
var net_utils = require('./net_utils');
var util = require('util');
var crypto = require('crypto');


exports.register = function() {
    this.inherits('auth/auth_base');
    var plugin = this;
    try {
        plugin.pg = require('pg');
    }
    catch (e) {
        plugin.logerror("failed to load pg, " +
                        " try installing it: npm install pg");
        return;
    }

    // only load this stuff if postgres loaded
    plugin.load_postgres_ini();
};


exports.load_postgres_ini = function() {
    var plugin = this;
    plugin.cfg = plugin.config.get('secrets/postgres.ini', 'ini', function () {
        plugin.load_postgres_ini();
    });
};


exports.hook_capabilities = function(next, connection) {
    // Do not allow AUTH unless private IP or encrypted
    if (!net_utils.is_rfc1918(connection.remote_ip) && !connection.using_tls) {
        return next();
    }

    var methods = ["PLAIN","LOGIN"];
    connection.capabilities.push('AUTH ' + methods.join(' '));
    connection.notes.allowed_auth_methods = methods;

    return next();
};


exports.compare_passwd = function (mailbox_password, password) {
    var plugin = this;
    // get salt
    var encoded = mailbox_password.split("{SSHA512}")[1];
    var decoded = new Buffer(encoded, 'base64');
    var salt = decoded.slice(decoded.length-5, decoded.length);

    var pw_buf = new Buffer(password);
    var hashed_pw = '{SSHA512}' + Buffer.concat([crypto.createHash('sha512').update(Buffer.concat([pw_buf, salt])).digest(), salt]).toString('base64')
    if (hashed_pw == mailbox_password) {
        return true;
    } else {
        return false;
    }
};


exports.check_plain_passwd = function(connection, user, passwd, cb) {
    var plugin = this;
    plugin.passwd = passwd;
    var pg_callback = function (err, client, done, passwd) {
        if(err) {
            return plugin.logerror('error fetching client from pool', err);
        }
        client.query('SELECT password FROM mailboxes where full_address = $1', [user], function(err, result) {
            //call `done()` to release the client back to the pool
            done();

            if(err) {
                return plugin.logerror('error running query', err);
            }
            // plugin.loginfo(util.inspect(result));
            if (result.rows.length == 1) {
                var mailbox_password = result.rows[0].password;
                if (plugin.compare_passwd(mailbox_password, plugin.passwd)) {
                    cb(true);
                } else {
                    cb(false);
                };
            } else {
                cb(false);
            };
        });
    };
};
