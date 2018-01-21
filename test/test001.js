const
	PouchStore = require("../"),
	promisify = require("util").promisify,
	assert = require('assert');

const
	SID1 = "12345678",
	SID2 = "abcdefgh";

let store = new PouchStore();
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
				store.get(SID1, function(err,data){
					if(data!=null) done(new Error("Data must be null"));
					else done(err);
				});
			});
		});
	});

	describe('#all(cb)', function() {
		it('Should get all sessions', function(done) {
			let s1 = {data:{s1:"s1"}};
			let s2 = {data:{s2:"s2"}};

			Promise.
				all([storeSet(SID1,s1),storeSet(SID2,s2)]).
				then(()=>{
					store.all((err,data)=>{
						assert(data.length==2);
						done(err);
					});
				}).
				catch(done);
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
