/**
 * @overview: Check if the domain belongs to us
 *
 * @author Michael Bruderer
 * @version 2016/01/27
 */

'use strict';

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
  plugin.register_hook('rcpt', 'resolve_domain');
};


exports.load_postgres_ini = function() {
  var plugin = this;
  plugin.cfg = plugin.config.get('secrets/postgres.ini', 'ini', function () {
    plugin.load_postgres_ini();
  });
};


exports.resolve_domain = function(next, connection, params) {
  var plugin = this;
  var txn = connection.transaction;
  var host = params[0].host;

  var pg_callback = function (err, client, done) {
    if(err) {
      plugin.logerror('error fetching client from pool', err);
      return next(DENYSOFT, DSN.temp_resolver_failed());
    }
    client.query('SELECT count(*) FROM domains where name = $1', [host], function(err, results) {
      //call `done()` to release the client back to the pool
      done();

      if(err) {
        return next(DENY, DSN.relaying_denied);
      }
      if (results.rows[0].count == '1') {
        // callback to check if address with us
        plugin.logdebug("Domain found in our database");
        next();
      } else {
        // nope, not with us
        plugin.logdebug("Domain NOT found in our database");
        return next(DENY, DSN.relaying_denied);
      };
    })
  };


  // basic checks
  if (!txn) {
    plugin.logdebug("txn: ", txn);
    return next(DENY, DSN.addr_bad_from_syntax);
  }

  if (!host) {
    plugin.logdebug("host: ", host);
    return next(DENY, DSN.addr_bad_from_syntax);
  }

  // run query and callback
  plugin.pg.connect(plugin.cfg.main.connectionString, pg_callback);
};
