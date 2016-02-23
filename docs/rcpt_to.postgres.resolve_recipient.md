rcpt\_to.postgres.resolve\_recipient
====================================

This plugin checks whether a recipient is in the database.
If found in the database, the recipient is accepted.

## Configuration
This plugin uses the configuration `postgres.ini` in INI format.


- connectionString = postgres://user:password@host/database (REQUIRED)

    Set the connection to the postgres database.


### Example Database

A database example would be:

    table: mailboxes

    id | full_address
