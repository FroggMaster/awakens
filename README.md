spooks-chatjs
================

![Spooks logo variant](http://i.imgur.com/gs3iohM.jpg "Spooks logo")

A simple Node.JS chat server with some user management and games.

#Requirements
* node.js (npm) installed 
* MySQL server installed and running

#Local Installation
1. Create a database schema called nodejs_chat.
2. Execute the sql files inside sql/, starting by sql/nodejs_chat.sql on this schema to create the tables.
3. Rename the `./conf/settings.local` to be `./conf/settings.json` and edit it so that the server can connect to the database.
4. Run `npm install`
5. Run `node server.js` on command line in the main project folder

All done! To suppress console output, run "node server.js >/dev/null &" instead.

#/dev
* Don't commit directly to master! We're doing branching now, so new features and suggestions should be committed to the dev branch instead, so the master branch doesn't get ahead the dev branch.
* Run your own instance of the chat and never commit untested code unless it's very important and you're 100% sure it won't break dev.
* There's a server running the dev branch available at <http://aws.bruno02468.com/>
