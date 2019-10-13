const
	PouchStore = require("../"),
	promisify = require("util").promisify,
	debug = require('debug')('mocha-test'),
	assert = require('assert');

const
	SID1 = "12345678",
	SID2 = "87654321";

let store = new PouchStore(process.env.URL||undefined);
let storeSet = promisify(store.set.bind(store));

describe('Basic features', function() {
	var session1 = {data : {key1:"val1", key2:"val2"}}

	describe('#set(sid, session, cb)', function() {
		it('Should store a new session', function(done) {
			store.set(SID1, session1, done);
		});
	});

	describe('#get(sid, cb)', function() {
		it('Should retrieve the created session (cached)', function(done) {
			store.get(SID1, function(err, sess){
				assert.deepEqual(sess.data,session1.data);
				done();
			});
		});
	});

	describe('#touch(sid, cb)', function() {
		it('Should refresh session', function(done) {
			let oldts = session1.$ts;
			store.touch(SID1, session1, function(err, sess){
				store.get(SID1, function(err, sess){
					assert(oldts<sess.$ts,"New timestamp");
					done();
				});
			});
		});
	});

	describe('#destroy(sid, cb)', function() {
		it('Should destroy session', function(done) {
			store.destroy(SID1, function(err) {
				debug('test destroy',err);
				store.all(function(err,list){
					debug('test destroy all',err,list);
					let idx = list.findIndex(s=>s.id==SID1);
					if(idx>=0) done(new Error("Data must be null"));
					else done(err);
				});
			});
		});
	});

	describe('#all(cb)', function() {
		it('Should get all sessions', function(done) {
			let s1 = {data:{s1:"s1"},$commit:true};
			let s2 = {data:{s2:"s2"},$commit:true};

			store.clear(function(){
				Promise.
					all([storeSet(SID1,s1),storeSet(SID2,s2)]).
					then(()=>{
						store.all((err,data)=>{
							debug('all',err,data);
							assert(data.length==2);
							done(err);
						});
					}).
					catch(function(err){
						debug('all',err);
						done(err);
					});
			});
		});
	});

	describe('#length(cb)', function() {
		it('Should get length of store', function(done) {
			store.length((err,len)=>{
				assert(len==2);
				done(err);
			});
		});
	});

	describe('#clear(cb)', function() {
		it('Should clear session store', function(done) {
			store.clear((err)=>{
				if(err) done(err);
				else {
					store.length((err,len)=>{
						assert(len==0);
						done(err);
					});
				}
			});
		});
	});
});

after(function(){
	process.exit(0);
});
