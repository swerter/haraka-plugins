/**
 * @overview: Stores email into a maildir folder
 *
 * @author : Michael Bruderer
 * @version 2016/01/26
 */

var util = require('util');
var outbound = require('./outbound');
var constants = require('./constants');

exports.hook_queue = function (next, connection) {
  var plugin = this;
  var txn = connection.transaction;
  if (!txn.notes.store_to_disk) {
    outbound.send_email(txn, function(retval, msg) {
      switch(retval) {
      case constants.ok:
        plugin.logdebug("OUTBOUND OK");
        return next(OK); // pass to maildir plugin
        break;
      case constants.deny:
        plugin.logdebug("OUTBOUND DENY");
        return next(DENY, msg);
        break;
      default:
        plugin.logdebug("OUTBOUND DEFAULT");
        return next(DENYSOFT, msg);
      }
    });
  }
}
