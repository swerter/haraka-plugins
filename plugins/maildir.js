/**
 * @overview: Stores email into a maildir folder
 *
 * @author : Mostly taken from https://github.com/madeingnecca/haraka-plugins/blob/master/maildir.js
 * @version 2016/01/26
 */

var os = require('os');
var fs = require('fs');
var path = require('path');
var util = require('util');


exports.register = function() {
  var plugin = this;

  try {
    plugin.mkdirp = require('mkdirp');
  }
  catch (e) {
    plugin.logerror("failed to load mkdirp, " +
                    " try installing it: npm install mkdirp");
    return;
  }

  plugin.load_maildir_ini();
  plugin.register_hook('queue', 'maildir');
};


exports.load_maildir_ini = function() {
  var plugin = this;
  plugin.cfg = plugin.config.get('maildir.ini', 'ini', function () {
    plugin.load_maildir_ini();
  });
};

/**
 * Saves email when the smtp server enqueues it.
 */
exports.maildir = function(next, connection) {
  var plugin = this;
  var txn = connection.transaction;


  var accept = function() {
    next(OK);
  };
  var cont = function() {
    next();
  };


  var mail_from = extractEmail(txn.mail_from.original);
  var rcpt_to = txn.rcpt_to.map(function(to) {
    return to.user + '@' + to.host;
  });

  var maildir = new Maildir(plugin.cfg.main, this, connection);
  var stream = txn.message_stream;
  var spam_threshold = plugin.cfg.main.rspamd_spam_threshold;

  var spam_score = 0
  if (txn.header.headers_decoded['x-rspamd-score']) {
    spam_score = txn.header.headers_decoded['x-rspamd-score'][0];
  };

  var is_spam = false;
  if (spam_score > spam_threshold) {
    is_spam = true;
  };

  // Give the possibility to force the maildir user.
  // var forced = trim(txn.header.get('x-maildir-force-user')) || plugin.cfg.main.force_user;
  // if (forced) {
  //   maildir.maildir({user: forced}).messageStream(stream, accept);
  //   return;
  // }

  // Collect mailboxes.
  var mailboxes = [];


  if (txn.notes.store_to_disk) {
    if (is_spam) {
      plugin.loginfo("Email is spam, move to spam folder. Score: " + util.inspect(spam_score));
      rcpt_to.forEach(function(email) {
        maildir.maildir({user: email, folder: ".Junk"}).messageStream(stream, accept);
      });
    } else {
      rcpt_to.forEach(function(email) {
        maildir.maildir({user: email}).messageStream(stream, accept);
      });
    }
  } else {
    next();
  }
};

/**
 * Object for managing maildirs.
 * @param {hash} cfg
 */
function Maildir(cfg, plugin, conn) {
  this.cfg = cfg;
  this.plugin = plugin;
  this.connection = conn;
}

/**
 * Unique name of the file inside the maildir.
 * Thanks: http://cr.yp.to/proto/maildir.html
 *
 * @return {string}
 */
Maildir.prototype.fileName = function() {
  // For filename uniqueness, connection uuid is used.
  var uuid = this.connection.uuid;
  var d = new Date();
  var name = d.valueOf() + '.' + uuid + '.' + os.hostname();
  return name;
};

Maildir.prototype.maildir = function(params) {
  var self = this;
  var user = params.user;
  var folder = params.folder;
  var userParts = user.split('@');
  var name = userParts[0], domain = userParts[1];
  var dirMode, fileMode;

  return {
    ready: function(callback) {
      var fileName = self.fileName();
      var dirs = ['tmp', 'cur', 'new'];
      var maildir = self.cfg.path;
      dirMode = parseInt(self.cfg.dir_mode, 8);
      fileMode = parseInt(self.cfg.file_mode, 8);

      var replace = {d: domain, n: name};
      var v;
      for (v in replace) {
        maildir = maildir.replace('%' + v, replace[v]);
      }

      // Checks if maildir location is relative to haraka.
      // FIXME: only works on *nix systems.
      if ('/' !== maildir.charAt(0)) {
        maildir = path.join(process.env.HARAKA, maildir);
      }

      var f = {};
      dirs.forEach(function(dir) {
        var parts = [maildir];
        if (folder) {
          parts.push(folder);
        }
        parts.push(dir);
        parts.push(fileName);
        f[dir] = path.join.apply(path, parts);
      });

      (function nextDir(i, cb) {
        if (i === dirs.length) {
          return cb();
        }

        var dir = path.dirname(f[dirs[i]]);
        fs.exists(dir, function(exists) {
          if (exists) {
            nextDir(i + 1, cb);
          }
          else {
            self.plugin.mkdirp(dir, dirMode, function(err) {
              if (err) {
                throw err;
              }
              nextDir(i + 1, cb);
            });
          }
        });
      }(0, function() {
        self.plugin.logdebug('Maildir ready: ' + util.format('%j, %s', f, fileName));
        callback(f, fileName);
      }));
    },
    messageStream: function(stream, callback) {
      this.ready(function(f, name) {
        var fileStream = fs.createWriteStream(f['tmp'], {
          flags: 'w',
          mode: fileMode
        });
        stream.pipe(fileStream);
        fileStream.on('finish', function() {
          fs.link(f['tmp'], f['new'], function(err) {
            if (err) {
              throw err;
            }
            fs.unlink(f['tmp'], function(err) {
              if (err) {
                throw err;
              }
              callback();
            });
          });
        });
      });
    }
  };
};

/**
 * Extracts the email from a recipient address (USER <EMAIL>).
 * See "Address Specification" in http://tools.ietf.org/html/rfc2822.
 *
 * @param  {string} rcpt the recipient
 * @return {string}      the extracted email.
 */
function extractEmail(rcpt) {
  var emailRegexp = /([^<@\s,]+@[^@>,\s]+)/;
  var match;

  if ((match = rcpt.match(emailRegexp)) && match.length) {
    return match[1];
  }

  return null;
}


/**
 * Removes both leading and trailing whitespaces
 * from a string.
 *
 * @param  {string} string
 * @return {string}
 */
function trim(string) {
  return string.replace(/^\s+|\s+$/g, '');
}
