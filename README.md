spooks-chatjs
================

![Spooks logo variant](http://i.imgur.com/gs3iohM.jpg "Spooks logo")

A simple Node.JS chat server with some user management and games.

#requirements
1. node.js (npm) installed 
2. MySQL server installed and running

#local Installation
1. Create a database schema called nodejs_chat.
2. Execute the sql files inside sql/, starting by sql/nodejs_chat.sql on this schema to create the tables.
3. Rename the `./conf/settings.local` to be `./conf/settings.json` and edit it so that the server can connect to the database.
4. Run `npm install`
5. Run `node server.js` on command line in the main project folder

All done! To suppress console output, run "node server.js >/dev/null &" instead.

#/dev
1. Don't commit directly to master! New features and suggestions should be committed directly to the dev branch.
2. Run your own instance of the chat and never commit untested code unless you're 100% sure it won't break dev.
3. There's a server running the dev branch available at <http://aws.bruno02468.com/>
4. Happy hacking!

#license

Spooks uses the [GNU Public License v2.0](https://github.com/InfraRaven/spooks-chatjs/blob/dev/LICENSE)

#related projects

Insert projects here
