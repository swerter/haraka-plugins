maildir
=======

Stores the email into a file in a maildir structure. See [here](https://en.wikipedia.org/wiki/Maildir) for more
info about the maildir format. This plugin is a simplified version of
[maildir plugin for local delivery](https://github.com/madeingnecca/haraka-plugins).

The email is being stored as `domain/user`. Example: an email for peter.pan@example.com will
be stored in example.com/peter.pan/new/


## Configuration
This plugin uses the configuration `maildir.ini` in INI format.


- path = /var/emails (REQUIRED)

    Set the destination directory to store the email

- dir_mode = 0750 (REQUIRED)

    Set the permission of the new directory

- rspamd_move_to_spam = true (REQUIRED)

    Whether to move a email marked as spam to the .Spam folder instead
    of into the inbox.

- rspamd_spam_threshold = 8.0 (REQUIRED)

    Above which threshold the email should be moved to the spam folder.
