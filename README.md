# session-pouchdb-store

A [PouchDB](https://pouchdb.com/) session store for [express.js](http://expressjs.com/).

[![Build Status](https://travis-ci.org/solzimer/session-pouchdb-store.svg?branch=master)](https://travis-ci.org/solzimer/session-pouchdb-store)

## Features
* Compatible with PouchDB and CouchDB (or any database that uses the CouchDB API).
* Realtime session data synchronization between processes (if PouchDB/CouchDB server is used)
* Default in-memory PouchDB instance.
* Custom PouchDB instance.
* Scavenge and purge invalid/expired sessions.

## Installation
```
npm install session-pouchdb-store --save
```
This will install `session-pouchdb-store` and add it to your application's `package.json` file.


## Important Notes

If you use a remote PouchDB server, make sure the database exists prior to start your application/s

## Basic Usage

Use with your express session middleware, like this:
```js
const
	express = require("express"),
	session = require("express-session"),
	PouchSession = require("session-pouchdb-store");

let app = express();

app.use(session({
  secret: 'thisismysecret',
  resave: false,
  saveUninitialized: true,
	store : new PouchSession()
}));

app.listen(3000, () => {
	console.log(`Server ${process.pid} started on port 3000`);
});
```
By default, PouchSession creates an in-memory database for testing purposes. You can pass your own instance or connect to a remote PouchDB/CouchDB server:

### Remote PouchDB server
```js
app.use(session({
  secret: 'thisismysecret',
  resave: false,
  saveUninitialized: true,
	store : new PouchSession('http://pouchdbserver:port/sessions')
}));
```

### Custom instance
```js
const PouchDB = require('pouchdb');

let db = new PouchDB("sessions",{adapter:'leveldb'});
app.use(session({
  secret: 'thisismysecret',
  resave: false,
  saveUninitialized: true,
	store : new PouchSession(db)
}));
```
### Realtime synchronization
In order to synchronize session data, the current version of the store requires a remote PouchDB server, so multiple express processes can connect to the same database and perform synchronization.

## API
### new PouchSession(pouchInstance, options)
Creates a new store instance. The first argument can be one of the following:
* **undefined** If no arguments is passed, a default in-memory instance is created.
* **PouchDB instance** The PouchDB instance that will be used by the store.
* **URL string** A URL string to a remote PouchDB/CouchDB server.
* **string** A simple string is used as a file path for leveldb storage

Options is an object that allows overriding some store behaviours:
* **maxIdle** Max time in ms a session can go idle. When this time exceeds, the session is remove from the store cache. Note that a session can be idle and still be a valid session; session expiration is defined by the express-session module. The purpose of this parameter is to release from memory sessions that are not being used.
* **scavenge** Interval time in ms that the store will search and release *maxIdle* sessions.
* **purge** Interval time in ms that the the store will remove expired sessions from the database.

Default options are as follows:

Here is a list of all available options:
```js
var options = {
	// Max idle time in ms
	maxIdle : 5*60*1000,
	// Scavenge period in ms
	scavenge : 1000,
	// Database purge period in ms					
	purge : 5*60*1000			
};
```
