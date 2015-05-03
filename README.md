spooks-chatjs
================

![Spooks logo variant](http://i.imgur.com/gs3iohM.jpg "Spooks logo")

A simple Node.JS chat server with some user management and games.

#Requirements
1. node.js installed 
2. MySQL server installed

#Local Installation
1. Create a database schema called nodejs_chat
2. Execute the sql files inside /sql/ on this schema to create the tables
3. Rename the conf/settings.local to be conf/settings.json and edit it if required
4. Install npm and run node server.js on command line in the main project folder

#Developing
1. Don't commit directly to master! New features and suggestions should be **tested first on localhost** then sent to the dev branch.
2. Run your own instance of the chat and never commit untested code unless you're 100% sure it won't break dev.
3. A server running the dev branch is available at <http://2s4.me/>
