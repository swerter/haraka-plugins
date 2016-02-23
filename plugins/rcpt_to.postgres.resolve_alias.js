/**
 * @overview: Check if the recipient has an alias in the postgres database
 *
 * @author : Michael Bruderer
 * @version 2016/01/27
 */

'use strict';

var DSN = require('./dsn');
var Address = require('./address').Address;

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

  // only load this stuff if postgres loaded
  plugin.load_postgres_ini();
  plugin.register_hook('rcpt', 'resolve_alias');
};


exports.load_postgres_ini = function() {
  var plugin = this;
  plugin.cfg = plugin.config.get('secrets/postgres.ini', 'ini', function () {
    plugin.load_postgres_ini();
  });
};


exports.resolve_alias = function(next, connection, params) {
  var plugin = this;
  var txn = connection.transaction;
  var recipient = params[0].address();

  var pg_callback = function (err, client, done) {
    if(err) {
      plugin.logerror('error fetching client from pool', err);
      return next(DENYSOFT, DSN.temp_resolver_failed());
    }
    client.query('SELECT destination FROM aliases WHERE full_address = $1', [recipient], function(err, results) {
      //call `done()` to release the client back to the pool
      done();
      if (err) {
        return next(DENYSOFT, DSN.temp_resolver_failed());
      }
      if (!results.rows.length) {
        return next(DENY, DSN.relaying_denied);
      }
      // We found alias(es)
      txn.notes.has_alias = true;

      var resolvedAddresses = [];
      for (var i = 0, l = results.rows.length; i < l; i += 1) {
        if (results.rows[i].destination.toLowerCase() !== recipient.toLowerCase()) {
          resolvedAddresses.push(results.rows[i].destination);
        }
      }

      // find index of address in recipients array
      var recipients = txn.rcpt_to,
          recipientIndex,
          recipientsIndexOfAddress = function(address) {
            for (var i = 0, l = recipients.length; i < l; i += 1)
              if (recipients[i].address().toLowerCase() === address.toLowerCase())
                return i;
            return -1;
          };

      // The recipient does not exist in own array?
      recipientIndex = recipientsIndexOfAddress(recipient);
      if (recipientIndex === -1) {
        return next(DENY, DSN.relaying_denied);
      }

      // Remove all addresses that have already been added so only one email per recipient goes out
      var idx, alias;
      for (var i = 0, l = resolvedAddresses.length; i < l; i += 1) {
        alias = resolvedAddresses[i];
        idx = recipientsIndexOfAddress(alias);
        if (idx === -1) {
          plugin.loginfo("Found alias: " + alias);
          resolvedAddresses[i] = new Address(alias);
        } else {
          // remove the address
          resolvedAddresses.splice(idx, 1);
        }
      }

      // Remove the recipient from recipients, so we can replace with resolved aliases
      recipients.splice(recipientIndex, 1);

      // add the addresses
      Array.prototype.push.apply(recipients, resolvedAddresses);

      return next(OK);
    })
  };
  // run query and callback
  plugin.pg.connect(plugin.cfg.main.connectionString, pg_callback);
};
