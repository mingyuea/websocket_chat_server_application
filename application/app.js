const http = require('http');
const static = require('node-static');
const url = require('url');
const socketIO = require('socket.io');

const fileServer = new static.Server('./application/static');

const PORT = 5000;

const server = http.createServer(requestHandler);
const io = socketIO(server);


function cookieParser(cookieString){
	let cookieObj = {}
	let cookieArr = cookieString.split(";");
	
	cookieArr.forEach(cookieStr => {
		let tmpArr = cookieStr.split("=");
		cookieObj[tmpArr[0].trim()] = tmpArr[1].trim();
	});

	return cookieObj;
}


function requestHandler(req, res){
	let pathname = url.parse(req.url).pathname;

	

	/*if(pathname == "/"){
		//console.log("/ home");
		let cookies = req.headers.cookie;

		if(cookies){
			console.log("has cookies");
			cookies = cookieParser(cookies);

			if(cookies["auth"]){
				//serve chat
				console.log("has auth");
			}
			else{
				//serve login
				//fileServer.serveFile("/auth.html", 200, {"test":"tes1"}, req, res);
				//fileServer.serve(req, res);
				//res.resume();
				console.log("has no auth");
			}
		}
		else{
			console.log("no cookies");
			//fileServer.serve(req, res);
			//fileServer.serveFile("/auth.html", 200, {"test":"tes1"}, req, res);
			//res.resume();
		}
	}
	else if(pathname == "/static/auth"){
		//fileServer.serveFile("/index.html", 200, {}, req, res);
		console.log("auth static");
	}
	else if(pathname == "/static/chat"){
		console.log("chat static");
	}
	else if(pathname == "/auth/login"){
		console.log("login");

		let cookieStr = "auth=testAuth";
		let jsonStr = JSON.stringify({"actionSucces": true});

		/*res.writeHead(200, {
			'Set-Cookie': cookieStr,
			'Content-Type': 'text/plain'
		});

		let headerObj = {
			'Set-Cookie': cookieStr,
			'Content-Type': 'text/plain'
		}

		//fileServer.serveFile("/index.html", 302, headerObj, req, res);
	}
	else if(pathname == "/auth/register"){
		console.log("register")
	}
	else if(pathname == "/auth/anon"){
		console.log("anon")
	}*/

	 req.addListener('end', function() {
    	fileServer.serveFile("/index.html", 200, {"test":"tes1"}, req, res)
    }).resume();;

	//req.addListener('end', () => fileServer.serveFile("/auth.html", 200, {"test":"tes1"}, req, res)).resume();
	//req.addListener('end', () => fileServer.serve(req, res)).resume();
}


let users = {};
let ids = {};

io.on('connection', (socket) => {
	console.log(socket.handshake.headers.cookie);

	socket.on('login', (username, pass, resHandler) => {
		console.log(socket.id, username);
		users[username] = socket.id;
		ids[socket.id] = username; 
		resHandler(true, null);
		socket.broadcast.emit('newUser', {"username": username, "id": socket.id})
	});

	socket.on('pollUsers', (updateFn) => {
		console.log("polling users");
		updateFn(users);
	})

	socket.on('message', (input, username) => {
		let userID = users[username];

		socket.to(userID).emit('inMsg', input);
		console.log(input, userID);
	})

	socket.on('disconnect', () => {
		let uName = ids[socket.id];
		delete users[uName];

		socket.broadcast.emit('updateUsers', users);
		console.log("User disconnected: " + socket.id);

	})
})

server.listen(PORT, () => console.log("Node server is running on PORT " + PORT));