const
	Store = require("express-session").Store,
	PouchDB = require("pouchdb"),
	extend = require("extend"),
	PouchDBMemory = require('pouchdb-adapter-memory');

PouchDB.plugin(PouchDBMemory);

/**
 * Default Store options
 * @type {Object}
 */
const DEF_OPTS = {
	maxIdle : 5*60*1000,	// Max idle time in ms
	scavenge : 1000,			// Scavenge period in ms
	purge : 5*60*1000			// Database purge period in ms
}

function instance(pouchDB) {
	if(typeof(pouchDB)=="string")
		return new PouchDB(pouchDB);
	else if(pouchDB instanceof PouchDB)
		return pouchDB;
	else if(typeof(pouchDB)=="object")
		return new PouchDB(pouchDB);
	else
		return new PouchDB("sessions",{adapter:"memory"});
}

/**
 * PouchDB express session store.
 * @class
 * @extends Store
 */
class SessionStore extends Store {
	/**
	 * Constructor
	 * @param {PouchDB} pouchDB A PouchDB instance, and initialization PouchDB
	 * options object, or a remote PouchDB/CouchDB url string.
	 * @param {mixed} options Configuration options
	 */
	constructor(pouchDB,options) {
		super();
		this.pouch = instance(pouchDB);
		this.sessions = {};
		this.options = extend({},DEF_OPTS,options);
		this._subscribe();
		this._timers();
	}

	/**
	 * Starts the purge and scavenge timers.
	 * @ignore
	 */
	_timers() {
		let opt = this.options;

		setInterval(()=>{
			let now = Date.now();
			Object.keys(this.sessions).forEach(sid=>{
				let sess = this.sessions[sid];
				if(now-sess.$ts > opt.maxIdle) {
					delete this.sessions[sid];
				}
			});
		},opt.scavenge);
	}

	/**
	 * Subscribe to PouchDB changes, so we can keep real-time synched
	 * versions of the sessions.
	 * @ignore
	 */
	_subscribe() {
		this.pouch.changes({
		  since: 'now',
		  live: true,
		  include_docs: true
		}).on('change', change => {
			let id = change.doc._id, old = this.sessions[id];
			if(old) extend(old,change.doc);
		}).on('complete', info => {
			console.error("COMPLETE",info);
		}).on('error', err => {
			console.error("ERROR",err);
		});
	}

	/**
	 * Retrieve all stored sessions
	 * @param  {Function} callback Callback function (err,sessions)
	 */
	all(callback) {
		this.pouch.allDocs({include_docs:true, attachments:true},callback);
	}

	/**
	 * Destroys a session
	 * @param  {string} sid Session ID
	 * @param  {Function} callback Callback function (err,sessions)
	 */
	destroy(sid, callback) {
		this.pouch.remove(sid,callback);
	}

	/**
	 * Clears all the session storage
	 * @param  {Function} callback Callback function (err)
	 */
	clear(callback) {
		this.pouch.
			allDocs({include_docs: true}).
			then(allDocs => allDocs.rows.map(row => {
	    	return {_id: row.id, _rev: row.doc._rev, _deleted: true};
	  	})).
			then(deleteDocs => db.bulkDocs(deleteDocs)).
			then(()=>callback()).
			catch(err=>callback(err));
	}

	/**
	 * Returns the number of current stored sessions
	 * @param  {Function} callback Callback function (err,length)
	 */
	length(callback) {
		this.pouch.
			allDocs({include_docs:false}).
			then(res=>callback(null,res.length)).
			catch(err=>callback(err));
	}

	/**
	 * Retrieve a session by its session ID
	 * @param  {string}   sid      Session ID
	 * @param  {Function} callback Callback function (err,session)
	 */
	get(sid, callback) {
		if(this.sessions[sid]) {
			callback(null,this.sessions[sid]);
		}
		else {
			this.pouch.
				get(sid,{attachments:true}).
				then(sess=>{
					this.sessions[sid] = sess;
					callback(null,sess);
				}).
				catch(err=>{
					if(err.status==404) callback();
					else callback(err);
				});
		}
	}

	/**
	 * Saves a session to the store
	 * @param {string}   sid      	Session ID
	 * @param {Session}  session  	Session to store
	 * @param {Function} callback 	Callback function (err,session)
	 */
	set(sid, session, callback) {
		if(!session._id) session._id = sid;
		session.$ts = Date.now();
		this.pouch.
			put(session).
			then(res=>{
				this.sessions[sid] = extend(this.sessions[sid],session,{_rev:res.rev});
				callback();
			}).
			catch(err=>{
				callback(err);
			});
	}

	/**
	 * Keeps alive a session (maxIdle timer)
	 * @param  {string}   sid      Session ID
	 * @param  {Session}  session  Session to refresh
	 * @param  {Function} callback Callback function (err)
	 */
	touch(sid, session, callback) {
		this.sessions[sid].$ts = Date.now();
		callback();
	}
}

module.exports = SessionStore;
