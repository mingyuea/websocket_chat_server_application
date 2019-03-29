const http         = require('http');
const url          = require('url');
const path         = require('path');
const socketIO     = require('socket.io');
const express      = require('express');
const cookieParser = require('cookie-parser');
const bodyParser   = require('body-parser');

/*Load custom routes and functions*/
const static   = require('./staticController.js');
const authHTTP = require('./authController.js');
const dbFun    = require('./databaseFunctions.js');
const cEnc     = require('./cookieEncryptFunc.js');


/*Connect the Postgres database*/
const { Pool } = require('pg');
const pool = new Pool({
	user: 'ming',
	host: 'localhost',
	database: 'chatdb',
	password: 'Secure1',
	port: 5432,
});


const PORT = 5000;

/*Create Express, Node HTTP, and Socket.io server*/
const app = express();
const server = http.createServer(app);
const io = socketIO(server);


pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err);
	process.exit(-1);
})

app.set('pool', pool);

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Header", "Origin, Content-Type");
	res.header("Access-Control-Allow-Credentials", true);
	//res.header("Access-Control-Allow-Origin", "http://localhost:8080")
	next();
});

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(authHTTP);
app.use(static);


app.get('/', (req, res) => {
	if(req.cookies && req.cookies.uid){
		res.redirect('/static/home');
	}
	else{
		res.redirect('/static/auth');
	}
});


/*app.get('/auth/temp', (req, res) =>{
	let userNum = Object.keys(users).length;
	userNum = "Anonymous:"+userNum;

	res.cookie('uid', userNum, {maxAge:720000});
	res.send({"actionSuccess": true, "redir": "/static/home"})
});


app.get('/test', async (req, res) => {
	console.log("test!")

	let result = await dbFun.test(pool);
	//async () => {
		

	console.log(result);
	//}
	res.send({"action": true, "result": result});
});*/

/*
app.post('/savechat', async (req, res) => {
	console.log("saving chat");

	let { partnerID, chatList } = req.body;
	let { uid } = req.cookies;

	chatList = chatList.map((msgObj, ind) => {
		if(msgObj.identity){
			msgObj.identity = uid;
		}
		else{
			msgObj.identity = partnerID;
		}
	});


	SAVE CHAT LIST TO DB TABLE NAME: 
	Math.min(uid, partnerID)+ ":" + Math.max(uid, partnerID)


	res.send({"actionSuccess": true});
});


app.post('/getchat', async (req, res) => {
	let { uid } = req.cookies;
	let { partnerID } = req.body;

	let tableName = Math.min(uid, partnerID)+ ":" + Math.max(uid, partnerID);

	//get chatList from tableName;


})*/


app.post('/exit', async (req, res) => {
	let { msgArr, partnerID } = req.body;
	let { uid } = req.cookies;
	let idNum = cEnc.cookieEncrypt(uid, false);
	let existBool;

	//check if table for users exists
	try{
		existBool = await dbFun.checkTableExist(pool, idNum, partnerID);
		existBool = existBool.exists;
	} catch(err){
		let errMsg = "Error saving chat: " + err
		console.error(errMsg);
		return res.send({"action": false, "error": errMsg});
	}

	//save msgArr if exists, if not create table then save chat
	if(existBool){
		try{
			await dbFun.saveChat(pool, idNum, partnerID, msgArr);
		} catch(err){
			let errMsg = "Error saving chat: " + err
			console.error(errMsg);
			return res.send({"action": false, "error": errMsg});
		}
	}
	else{
		try{
			await dbFun.createChatTable(pool, idNum, partnerID);
			await dbFun.saveChat(pool, idNum, partnerID, msgArr);
		} catch(err){
			let errMsg = "Error saving chat: " + err
			console.error(errMsg);
			return res.send({"action": false, "error": errMsg});
		}
	}

	console.log('exit', msgArr.length + " msgs recieved", existBool);
	res.send({"action": true, idNum});
});


const usersObj = {};   //{uid: username}
const socketIDObj = {}; //{socketID: uid}
const uidObj = {}; //{uid: socketID}

io.on('connection', (socket) => {
	//console.log(socket.handshake.headers.cookie, "ID",socket.id);
	console.log('login!', socket.id, typeof socket.handshake.headers.cookie);

	socket.on('test', async (resHandler) => {
		console.log("socket test", socket.handshake.headers.cookie);

		let result = await dbFun.test(pool);
		console.log(result);
		resHandler(result);
	});

	/*socket.on('login', (username, pass, resHandler) => {
		console.log(socket.id, username);
		users[username] = socket.id;
		ids[socket.id] = username; 
		resHandler(true, null);
		socket.broadcast.emit('newUser', {"username": username, "id": socket.id})
	});*/

	socket.on('pollUsers', (updateFn) => {
		console.log("polling users");
		updateFn(users);
	});

	socket.on('message', (input, username) => {
		let userID = users[username];

		socket.to(userID).emit('inMsg', input);
		console.log(input, userID);
	});

	socket.on('disconnect', (msgArr, partnerID) => {
		let uName = ids[socket.id];
		delete users[uName];

		socket.broadcast.emit('updateUsers', users);
		//console.log("User disconnected: " + socket.id, msgArr);
	});
})

server.listen(PORT, () => 
	console.log("Node server is running on PORT " + PORT)
);