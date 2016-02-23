auth\_pg
========

This plugin uses postgres to authenticate a user.
If the user is found in the database and the password
is correct, the user is authenticated.


## Configuration
This plugin uses the configuration `postgres.ini` in INI format.


- connectionString = postgres://user:password@host/database (REQUIRED)

    Set the connection to the postgres database.


### Example Database

A database example would be:

    table: mailboxes

    id | full_address | password

The password is stored in the salted [SSHA512](http://wiki2.dovecot.org/Authentication/PasswordSchemes) format.
