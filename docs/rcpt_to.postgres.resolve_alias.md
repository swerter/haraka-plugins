rcpt\_to.postgres.resolve\_alias
================================

A plugin to check if an alias exists for a recipient and if so resolve the alias.
Used when receiving emails.


## Configuration
This plugin uses the configuration `postgres.ini` in INI format.


- connectionString = postgres://user:password@host/database (REQUIRED)

    Set the connection to the postgres database.


### Example Database

A database example would be:

    table: aliases

    id | full_address | destination
