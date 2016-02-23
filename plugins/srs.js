/**
 * @overview: Simple sender rewriting scheme plugin
 *
 * @author : Michael Bruderer
 * @version 2016/01/27
 */

var Address = require('./address').Address;
var util = require('util');
var addressRfc2822 = require('address-rfc2822');

exports.register = function () {
    var plugin = this;
    try {
        plugin.SRS = require('srs.js');
    }
    catch (e) {
        plugin.logerror("failed to load srs, " +
                        " try installing it: npm install srs");
        return;
    }
    plugin.load_srs_ini();
    plugin.srs = new plugin.SRS({secret: plugin.cfg.main.secret});
    this.register_hook('data_post', 'srs_data_post');
    this.register_hook('bounce', 'srs_bounce');
};


exports.load_srs_ini = function() {
  var plugin = this;
  plugin.cfg = plugin.config.get('srs.ini', 'ini', function () {
    plugin.load_srs_ini();
  });
};


exports.hook_rcpt = function (next, connection, params) {
    var plugin = this;
    var trx = connection.transaction;

    var recipient = params[0];

    var srsReverseValue = null;

    try {
        srsReverseValue = plugin.srs.reverse(recipient.user);
    } catch (err) {
        plugin.loginfo(plugin, 'srs.reverse error. err.stack=' + err.stack + '.');
    }

    plugin.logdebug(plugin, 'srsReverseValue=' + srsReverseValue + '.');

    if (srsReverseValue) {
        var beforeSrsReverseRecipient = recipient;

        recipient = new Address(srsReverse[0], srsReverse[1]);

        var afterSrsReverseRecipient = recipient;

        trx.rcpt_to.pop();
        trx.rcpt_to.push(afterSrsReverseRecipient);

        plugin.loginfo(plugin, 'beforeSrsReverseRecipient=' + beforeSrsReverseRecipient + ', afterSrsReverseRecipient=' + afterSrsReverseRecipient + '.');
    }

    next();
};


exports.srs_data_post = function(next, connection, params) {
    var plugin = this;
    var trx = connection.transaction;
    var sender = trx.mail_from;
    var recipient = trx.rcpt_to;
    var srsReverseValue = null;

    if (trx.notes.has_alias) {
        var beforeSrsRewriteFrom = sender;
        var afterSrsRewriteFrom = new Address(plugin.srs.rewrite(sender.user, sender.host), plugin.cfg.main.sender_domain);

        trx.mail_from = afterSrsRewriteFrom;

        plugin.loginfo(plugin, 'beforeSrsRewriteFrom=' + beforeSrsRewriteFrom + ', afterSrsRewriteFrom=' + afterSrsRewriteFrom + '.');

    }
    next();
};


exports.srs_bounce = function (next, mail, err) {
    var plugin = this;

    var srsReverseValue = null;

    plugin.loginfo('mail.todo.mail_from=' + mail.todo.mail_from + '.');

    if (mail.todo.mail_from.user) {
        try {
            srsReverseValue = plugin.srs.reverse(mail.todo.mail_from.user);
        } catch (err) {
            plugin.loginfo('srs.reverse error. err.stack=' + err.stack + '.');
        }
    }

    plugin.loginfo('srsReverseValue=' + srsReverseValue + '.');

    if (srsReverseValue) {
        mail.todo.mail_from = new Address(srsReverseValue[0], srsReverseValue[1]);
    }

    next();
};
