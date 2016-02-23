srs: Sender rewrite scheme
================================

A plugin for SRS: sender rewrite scheme. See, for instance,
[here](https://www.unlocktheinbox.com/resources/srs/) for more
explanations.

## Configuration
This plugin uses the configuration `srs.ini` in INI format.

- secret = asecret (REQUIRED)

    Set the secret used for encoding the sender with srs. Important to change!

- sender_domain = example.com (REQUIRED)

    Set the domain from the email is being sent.
