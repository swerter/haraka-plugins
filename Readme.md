Haraka plugins
--------------

## Overview

A few plugins to be used with haraka

- auth_pg.js
- rcpt_to.postgres.resolve_alias.js
- rcpt_to.postgres.resolve_domain.js
- rcpt_to.postgres.resolve_recipient.js
- srs.js
- maildir.js
- outbound.js

See docs folder for more information about the individual plugins.

You also need to install the haraka address plugins:

    npm install address-rfc2821
    npm install address-rfc2822

## Postgres plugins

### Installation

- Have a running postgres database
- Install postgres nodejs plugin: npm install pg
- Set the correct connection string in config/postgres.ini


#### auth_pg.js
A plugin to check if a user is authorized to send emails. Checks the password in
the database. Is being used for sending out emails.


#### rcpt_to.postgres.resolve_alias.js
A plugin to check if an alias exists for a recipient and if so resolve the alias.
Used when receiving emails.


#### rcpt_to.postgres.resolve_recipient.js
A plugin to check if a recipient is present in the database.
Used when receiving emails.


## Other plugins

### srs.js
A plugin for SRS: sender rewrite scheme. See, for instance,
[here](https://www.unlocktheinbox.com/resources/srs/) for more
explanations.

Used when receiving an email for an alias-recipient, where the alias
points to another outside address.

#### Installation

Install srs.js in your haraka instance:

    npm install srs.js

### maildir.js
Stores the email into a file in a maildir structure. See [here](https://en.wikipedia.org/wiki/Maildir) for more
info about the maildir format. This plugin is a simplified version of
[maildir plugin for local delivery](https://github.com/madeingnecca/haraka-plugins).

### outbound.js
Sends emails further to the next recipients. Mainly to be used with the alias plugin.

## Example for an incoming mailserver config/plugins
In the RCPT TO section

    rcpt_to.postgres.resolve_domain
    rcpt_to.postgres.resolve_recipient
    rcpt_to.postgres.resolve_alias
    srs

In the QUEUE section

    maildir
    outbound


## Example for an outgoing mailserver config/plugins
In the AUTH section

    auth.pg

## Caveats
These plugins only have been tested on linux machines.
