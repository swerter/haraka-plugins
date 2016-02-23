rcpt\_to.postgres.resolve\_domain
================================

This plugin uses postgres to check if the domain accepts the email.
If the domain corresponds to the name in the domains table, the email
is accepted.


## Configuration
This plugin uses the configuration `postgres.ini` in INI format.


- connectionString = postgres://user:password@host/database (REQUIRED)

    Set the connection to the postgres database.


### Example Database

A database example would be:

    table: domains

    id | name
