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
		let self = this;

		setInterval(()=>{
			let now = Date.now();
			Object.keys(this.sessions).forEach(sid=>{
				let sess = this.sessions[sid];
				if(now-sess.$ts > opt.maxIdle) {
					delete this.sessions[sid];
				}
			});
		},opt.scavenge);

		async function commit() {
			await Promise.all(
				Object.keys(self.sessions).map(async(sid)=>{
					let sess = self.sessions[sid];
					let res = await self.pouch.put(sess);
					extend(sess,{_rev:res.rev});
				})
			);
			setTimeout(commit,opt.commit||1000);
		}
		setTimeout(commit,opt.commit||1000);
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
		this.pouch.allDocs({include_docs:true, attachments:true},(err,data)=>{
			if(err) callback(err);
			else callback(null,data.rows.map(row=>row.doc));
		});
	}

	/**
	 * Destroys a session
	 * @param  {string} sid Session ID
	 * @param  {Function} callback Callback function (err,sessions)
	 */
	async destroy(sid, callback) {
		try {
			let doc = await this.get(sid);
			delete this.sessions[sid];
			await this.pouch.remove(doc);
			callback();
		}catch(err) {
			callback(err);
		}
	}

	/**
	 * Clears all the session storage
	 * @param  {Function} callback Callback function (err)
	 */
	async clear(callback) {
		try {
			let allDocs = await this.pouch.allDocs({include_docs: true});
			let deleteDocs = allDocs.rows.map(row => {
				return {_id: row.id, _rev: row.doc._rev, _deleted: true};
			});
			await this.pouch.bulkDocs(deleteDocs);
			callback();
		}catch(err) {
			callback(err);
		}
	}

	/**
	 * Returns the number of current stored sessions
	 * @param  {Function} callback Callback function (err,length)
	 */
	length(callback) {
		this.pouch.
			allDocs({include_docs:false}).
			then(res=>callback(null,res.rows.length)).
			catch(err=>callback(err));
	}

	/**
	 * Retrieve a session by its session ID
	 * @param  {string}   sid      Session ID
	 * @param  {Function} callback Callback function (err,session)
	 */
	async get(sid, callback) {
		if(this.sessions[sid]) {
			callback(null,this.sessions[sid]);
		}
		else {
			try {
				let sess = await this.pouch.get(sid,{attachments:true});
				this.sessions[sid] = sess;
				callback(null,sess);
			}catch(err) {
				if(err.status==404) callback();
				else callback(err);
			}
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

		if(session.cookie && session.cookie.toJSON) {
			session.cookie = session.cookie.toJSON();
		}

		if(this.sessions[sid]) {
			let _rev = this.sessions[sid]._rev;
			extend(this.sessions[sid],session,{_rev});
		}
		else {
			this.sessions[sid] = session;
		}

		callback();
	}

	/**
	 * Keeps alive a session (maxIdle timer)
	 * @param  {string}   sid      Session ID
	 * @param  {Session}  session  Session to refresh
	 * @param  {Function} callback Callback function (err)
	 */
	touch(sid, session, callback) {
		let oldsession = this.sessions[sid];
		if(oldsession) {
			let _rev = oldsession._rev;
			extend(oldsession,session,{_rev});
			oldsession.$ts = Date.now();
			this.set(sid,oldsession,callback);
		}
		else {
			this.get(sid,(err,oldsession)=>{
				if(err) {
					callback(err);
				}
				else if(!oldsession) {
					callback(`Session ${sid} not found!`);
				}
				else {
					let _rev = oldsession._rev;
					extend(oldsession,session,{_rev});
					oldsession.$ts = Date.now();
					this.set(sid,oldsession,callback);
				}
			});
		}
	}
}

module.exports = SessionStore;
