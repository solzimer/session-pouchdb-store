const
	express = require("express"),
	session = require("express-session"),
	PouchSession = require("../");

let app = express();

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
	store : new PouchSession("http://localhost:10070/sessions")
}));

app.get("/get",(req,res)=>{
	res.json(req.session);
});

app.get("/set/:key/:val",(req,res)=>{
	req.session[req.params.key] = req.params.val;
	res.json(req.session);
});

app.get("/get/:key",(req,res)=>{
	res.json(req.session[req.params.key]);
});


app.listen(8080);
