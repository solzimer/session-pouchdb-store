const
	express = require("express"),
	session = require("express-session"),
	PouchSession = require("../");

let app = express();
let router = express.Router();

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
	path:'/',
	store : new PouchSession("http://localhost:5984/sessions")
}));

app.use('/',router);

// This ensures every other path has the same session cookie
router.get("/",(req,res,next)=>{
	debug(req.session.id);
	next();
});

router.get("/get",(req,res)=>{
	res.json(req.session);
});

router.get("/set/:key/:val",(req,res)=>{
	req.session[req.params.key] = req.params.val;
	res.json(req.session);
});

router.get("/get/:key",(req,res)=>{
	res.json(req.session[req.params.key]);
});


app.listen(process.env['PORT'] || 8080);
