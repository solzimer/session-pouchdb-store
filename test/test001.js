const
	PouchStore = require("../"),
	assert = require('assert');

const
	SID1 = "12345678",
	SID2 = "abcdefgh";

var store = new PouchStore();

describe('Basic features', function() {
	var session1 = {data : {key1:"val1", key2:"val2"}}

	describe('#set(sid, session, cb)', function() {
		it('Should store a new session', function() {
			store.set(SID1, session1, assert.ifError);
		});
	});

	describe('#get(sid, cb)', function() {
		it('Should retrieve the created session (cached)', function() {
			store.get(SID1, function(err, sess){
				assert.deepEqual(sess.data,session1.data);
			});
		});
	});

	describe('#touch(sid, cb)', function() {
		it('Should refresh session', function() {
			let oldts = session1.$ts;
			store.touch(SID1, session1, function(err, sess){
				store.get(SID1, function(err, sess){
					assert(oldts<sess.$ts);
				});
			});
		});
	});
});

after(function(){
	process.exit(0);
})
