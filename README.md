spooks-kpig
================

![Spooks logo variant](http://i.imgur.com/gs3iohM.jpg "Spooks logo")

A simple Node.JS chat server with some user management and games.

## Requirements
* node.js and npm installed  
  * Install dependendies: `npm install`
* MySQL installed

## Local Installation
1. Create a database called nodejs_chat
2. Add tables by executing the sql files inside /sql/
3. Rename conf/settings.local to conf/settings.json
<br>
<br>
To run:
`node server > /dev/null 2>&1 &`<br>
For local testing use:
`node server`

## Developing
* ***Don't commit directly to master!*** New features and suggestions should be tested first on localhost then sent to the dev branch.
* Run your own instance of the chat and never commit untested code unless you are certain it won't break dev.
* A server running the dev branch is available at **<http://spooks4.me/>**

### Server Restarting

**Please** do not use `nohup node server`, it creates output files like  [this](http://i.gyazo.com/e87040b6c4589bba8b1079a23ae221d2.png). If you find `nohup.out` files, or find evidence of any suspicious activity, let others know.
<br><br>
Use `node server > /dev/null 2>&1 &` which will [discard all output](http://stackoverflow.com/questions/8220098/how-to-redirect-the-output-of-an-application-in-background-to-dev-null) that is produced.

### Code Formatting

By tradition each tab should be set equal to 4 spaces. If possible, also set your text editor to insert spaces and not tabs. Tabs seem to mess up the code (at least sammich tells me).

Preferably, when editing Spooks code, user the "standard" brace style (a.k.a. [1TBS](http://en.wikipedia.org/wiki/Indent_style#Variant:_1TBS)). An example code block is below.

```
...
if (condition) {
    // Do this
} else {
    // Do this
}
```
