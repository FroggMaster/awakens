spooks-chatjs (kpig)
================

![Spooks logo variant](http://i.imgur.com/gs3iohM.jpg "Spooks logo")

A simple Node.JS chat server with some user management and games.

### Requirements:
1. node.js and npm installed  
Install dependendies: `npm install`
2. MySQL installed

### Local Installation:
1. Create a database called nodejs_chat
2. Add tables by executing the sql files inside /sql/
3. Rename conf/settings.local to conf/settings.json
<br>
<br>
To run:
`node server` or `nohup node server &`

### Developing:
1. ***Don't commit directly to master!*** New features and suggestions should be tested first on localhost then sent to the dev branch.
2. Run your own instance of the chat and never commit untested code unless you are certain it won't break dev.
3. A server running the dev branch is available at <http://2s4.me/>

