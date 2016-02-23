/**
 * @overview: Check if the recipient is in our database
 *
 * @author : Michael Bruderer
 * @version 2016/01/27
 */

'use strict';

var util = require('util');
var DSN = require('./dsn');

exports.register = function() {
  var plugin = this;

  try {
    plugin.pg = require('pg');
  }
  catch (e) {
    plugin.logerror("failed to load pg, " +
                    " try installing it: npm install pg");
    return;
  }

  // only load this plugin if postgres loaded
  plugin.load_postgres_ini();
  plugin.register_hook('rcpt', 'our_recipient');
};


exports.load_postgres_ini = function() {
  var plugin = this;
  plugin.cfg = plugin.config.get('secrets/postgres.ini', 'ini', function () {
    plugin.load_postgres_ini();
  });
};


exports.our_recipient = function(next, connection, params) {
  var plugin = this;
  var txn = connection.transaction;
  var recipient = params[0].address();
  var pg_callback = function (err, client, done) {
  plugin.logdebug("RESOLVE ADDRESS");
    if(err) {
      plugin.logerror('error fetching client from pool', err);
      return next(DENYSOFT, DSN.temp_resolver_failed());
    }
    client.query('SELECT 1 FROM mailboxes WHERE full_address = $1', [recipient], function(err, results) {
      //call `done()` to release the client back to the pool
      done();

      if(err) {
        plugin.logerror('error running query', err);
        return next(DENYSOFT, DSN.temp_resolver_failed());
      }

      if (results.rows.length) {
        // Recipient address with us
        txn.notes.store_to_disk = true;
        next(OK);
      } else {
        // Did not find recipient address, check in aliases
        txn.notes.store_to_disk = false;
        next();
      }
    })
  };

  if (!recipient) {
    txn.results.add(plugin, {skip: 'mail_from.null', emit: true});
    return next(DENY);
  }

  plugin.pg.connect(plugin.cfg.main.connectionString, pg_callback);
};
