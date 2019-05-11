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

/*
const pool = new Pool({
	user: 'ming',
	host: 'localhost',
	database: 'chatdb',
	password: 'Secure1',
	port: 5432,
});
*/

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: true
});


const PORT = process.env.PORT ||  5000;

/*Create Express, Node HTTP, and Socket.io server*/
const app = express();
const server = http.createServer(app);
const io = socketIO(server);


pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err);
	process.exit(-1);
});

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

app.get('/createtable', async(req, res) => {
	try{
		await pool.query('CREATE TABLE IF NOT EXISTS userauth(id SERIAL, username VARCHAR(50) UNIQUE, hash TEXT, PRIMARY KEY(id))');
	} catch(err){
		let errMsg = "There was an error creating the userauth table: " + err.stack;
		console.error(errMsg);
		return res.send({"actionSuccess": false, "error": errMsg});
	}

	console.log("userauth table created");
	res.send({"actionSuccess": true})
})

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

/*
app.post('/exit', async (req, res) => {
	let { msgArr, partnerID } = req.body;
	let { uid } = req.cookies;
	let idNum = cEnc.cookieEncrypt(uid, false);
	let existBool;

	//check if table for users exists
	try{
		existBool = await dbFun.checkChatTableExist(pool, idNum, partnerID);
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

	console.log('exit', msgArr.length + " msgs received", existBool);
	res.send({"action": true, idNum});
});
*/

/*This is an in-memory storage of all users currently online, their usernames, userID, and socketID
for quick and simple lookup.
*/
const userIDObj = {};   //{uid: username}
const usersArr = [];  //[username]
const usernameObj = {}; //{username: uid}
const socketIDObj = {}; //{socketID: uid}
const uidObj = {}; //{uid: socketID}

/*const userTracker = {
	userIDObj: {},
	usersArr: [],
	usernameObj: {},
	socketIDObj: {},
	uidObj: {}
}*/

io.on('connection', (socket) => {
	//console.log(socket.handshake.headers.cookie, "ID",socket.id);
	//console.log('login!', socket.id, socket.handshake.headers.cookie);
	
	/*(async function(){
			console.log("someone new");

			let clientCookies = socket.handshake.headers.cookie.split("; ");
			let cookieObj = {}
			clientCookies.forEach((cookieStr, ind) => {
				let tmpArr = cookieStr.split("=");
				let tmpObj = {};
				cookieObj[tmpArr[0]] = tmpArr[1];
			});

			let uid = cEnc.cookieEncrypt(cookieObj.uid, false);
			let sockID = socket.id;
			let uname, notifs;

			try{
				uname = await dbFun.getUsernameByID(pool, uid);
				uname = uname.username;
			} catch(err){
				let errMsg = "There was an error fetching username: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			//console.log(uid, sockID, uname);
			//need to check for notifications
			try{
				notifs = await dbFun.getNotificationsByUserID(pool, uid);
			} catch(err){
				let errMsg = "There was an error fetching notifications: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			//console.log("notif list", notifs)
			console.log(sockID, 'socket')
			uidObj[uid] = sockID;
			userIDObj[uid] = uname;
			usernameObj[uname] = uid;
			usersArr.push(uname);
			socketIDObj[socket.id] = uid;

			//console.log("CONNECT",uidObj, socketIDObj, usersArr);
			socket.emit('init', [], []);
			socket.broadcast.emit('newUser', uname);
	})();*/

	socket.on('userInit', async(resHandler) => {
			/*This handles user initialization after signing on, getting all relevant data for the user 
			and sending it to the client
			*/

			let clientCookies = socket.handshake.headers.cookie.split("; ");
			let cookieObj = {}
			clientCookies.forEach((cookieStr, ind) => {
				let tmpArr = cookieStr.split("=");
				let tmpObj = {};
				cookieObj[tmpArr[0]] = tmpArr[1];
			});

			let uid = cEnc.cookieEncrypt(cookieObj.uid, false);
			let sockID = socket.id;
			let uname, notifs, friendList;

			try{
				uname = await dbFun.getUsernameByID(pool, uid);
			} catch(err){
				let errMsg = "There was an error fetching username: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			/*need to check for notifications*/
			try{
				notifs = await dbFun.getNotificationsByUserID(pool, uid);
			} catch(err){
				let errMsg = "There was an error fetching notifications: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			let incomingFRList = [];
			let inMsgObj = {};

			notifs.forEach(async notifObj => {
				if(notifObj.notiftype == "fr"){
					incomingFRList.push(notifObj.partnername);
				}
				else if(notifObj.notiftype == "msg"){
					let msgCount;
					try{
						let lastMsgID = await dbFun.getLastMsgID(pool, uid, notifObj.partnerid);
						msgCount = Number(lastMsgID) - Number(notifObj.lastmsgid);
					} catch(err){
						let errMsg = "There was an error getting the last message ID for a partner while initiating: " + err;
						console.error(errMsg);
						socket.emit('newError', errMsg);
					}

					inMsgObj[notifObj.partnername] = msgCount;
				}
				else if(notifObj.notiftype == "both"){
					incomingFRList.push(notifObj.partnername);

					let msgCount;
					try{
						let lastMsgID = await dbFun.getLastMsgID(pool, uid, notifObj.partnerid);
						msgCount = Number(lastMsgID) - Number(notifObj.lastmsgid);
					} catch(err){
						let errMsg = "There was an error getting the last message ID for a partner while initiating: " + err;
						console.error(errMsg);
						socket.emit('newError', errMsg);
					}

					inMsgObj[notifObj.partnername] = msgCount;
				}
			});
			//console.log(incomingFRList, inMsgObj);

			let notifStateObj = {};
			notifs.forEach(notifObj => {
				notifStateObj[notifObj.partnername] = notifObj.notiftype;
			});

			/*gets user's friendList*/
			try{
				friendList = await dbFun.getFriendListByID(pool, uid);
			} catch(err){
				let errMsg = "There was an error getting friend list: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			friendList = friendList.map(userObj => userObj.username);

			//console.log("notif list", notifs)
			//console.log(sockID, 'socket');
			uidObj[uid] = sockID;
			userIDObj[uid] = uname;
			usernameObj[uname] = uid;
			socketIDObj[socket.id] = uid;

			if(!usersArr.includes(uname)){
				usersArr.push(uname);
			}

			console.log("CONNECT", uidObj, socketIDObj, usersArr);
			//console.log(usersArr);
			socket.broadcast.emit('newUser', uname);
			resHandler( usersArr, notifStateObj, incomingFRList, friendList, inMsgObj);
	})


	/*socket.on('test', async (resHandler) => {
		console.log("socket test", socket.handshake.headers.cookie);

		let result = await dbFun.test(pool);
		console.log(result);
		resHandler(result);
	});*/


	socket.on('switchUser', async (newPartner, newNotifType, selectHandler) => {
		/*this should retrieve all the chat history, and clear notifications of this user*/
		//console.log('selecting user', newPartner, newNotifType);
		
		let userID = socketIDObj[socket.id];
		let senderName = userIDObj[userID];
		let existBool, chatHist, newPartnerID;;

		if(usernameObj[newPartner]){
			newPartnerID = usernameObj[newPartner]
		}
		else{
			try{
				let userObj = await dbFun.getUserByName(pool, newPartner);
				newPartnerID = userObj.id;
			} catch(err){
				let errMsg = "There was an error getting partner ID from database: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}
			
		}

		if(newNotifType){
			//if a notification exists for new partner, clear or update it 

			if(newNotifType == "delete"){
				try{
					await dbFun.clearNotificationByPartnerID(pool, userID, newPartnerID);
				} catch(err){
					let errMsg = "There was an error updating notificaitons: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg);
				}
			}
			else{
				try{
					await dbFun.updateNotifByPartnerID(pool, userID, newPartnerID, newNotifType, true, null);
				} catch(err){
					let errMsg = "There was an error updating notificaitons: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg);
				}
			}
		}

		/* Should not exist, as msgs are now saved every time
		if(originalPartner && oldPartnerMsgArr.length > 0){
			//this should save the oldPartnerMsgArr to database
			console.log('saving chat with originalPartner', originalPartner);
			let dbExist;

			try{
				dbExist = await dbFun.checkChatTableExist(pool, userID, oldPartnerID);
			} catch(err){
				let errMsg = "There was an error checking for notifications and messages"+ err
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			if(!dbExist){
				try{
					await dbFun.createChatTable(pool, userID, oldPartnerID);
				} catch(err){
					let errMsg = "There was an error saving your chat"+ err
					console.error(errMsg);
					socket.emit('newError', errMsg);
				}
			}

			try{
				await dbFun.saveChat(pool, userID, oldPartnerID, oldPartnerMsgArr);
			} catch(err){
				let errMsg = "There was an error saving your chat"+ err
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			//sends old partner a notice, telling oldpartner to update chat state
			socket.to(oldPartnerSocket).emit("updateChatlist", senderName);
		}
		else{
			console.log('no old parnter to save chat with');
		}
		*/

		try{
			existBool = await dbFun.checkChatTableExist(pool, userID, newPartnerID);
		} catch(err){
			let errMsg = "There was an error checking for table"+ err
			console.error(errMsg);
			socket.emit('newError', errMsg);
		}

		if(existBool){
			/*retreives last 20 msgs*/
			try{
				chatHist = await dbFun.getMsgListFromChatTable(pool, userID, newPartnerID, 0);
			} catch(err){
				let errMsg = "There was an error fetching chat history: "+ err
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			chatHist = chatHist.map(msgObj => {
				return {msg: msgObj.msg, uid: msgObj.uid == userID}
			});

			selectHandler(chatHist);
		}
		else{
			/*Creates chat db*/
			try{
				await dbFun.createChatTable(pool, userID, newPartnerID);
			} catch(err){
				let errMsg = "There was an error creating chat table: "+ err
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}
			selectHandler([]);
		}
	});


	socket.on('message', async (input, receiverName, resHandler) => {
		let senderName = userIDObj[socketIDObj[socket.id]];
		let receiverID = usernameObj[receiverName];
		let receiverSocket = uidObj[receiverID];
		let senderID = socketIDObj[socket.id];

		if(receiverID) {	//receiver is currently online
			//console.log(receiverSocket);
			socket.to(receiverSocket).emit('inMsg', senderName, input);
			//console.log(input, receiverID);
		}
		else { 		// receiver is not online, save to database
			let existBool, notifType, lastMsgId;

			try{
				receiverID = await dbFun.getUserByName(pool, receiverName);
				receiverID = receiverID.id;
			} catch(err){
				let errMsg = "Message was not saved. There was an error getting the reciever username: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			try{
				lastMsgId = await dbFun.getLastMsgID(pool, senderID, receiverID);
			} catch(err){
				let errMsg = "Message was not saved. There was an error getting the last message id: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			/*try{
				existBool = await dbFun.checkChatTableExist(pool, senderID, receiverID);
			} catch(err){
				let errMsg = "Message was not saved. There was an error checking whether chat table exists: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}*/

			try{
				notifType = await dbFun.checkNotifTypeByPartnerID(pool, receiverID, senderID);
			} catch(err){
				let errMsg = "Message was not saved. There was an error checking notifications for partner: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}

			/*if(!existBool){
				try{
					await dbFun.createChatTable(pool, senderID, receiverID);
				} catch(err){
					let errMsg = "Message was not saved. There was an error creating new chat table: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg);
				}
			}
			
			try{
				await dbFun.saveChatSingle(pool, senderID, receiverID, input);
			} catch(err){
				let errMsg = "There was an error saving the message: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}*/

			if(notifType){
				//console.log("has notif", notifType);
				if(notifType == "fr"){
					try{
						await dbFun.updateNotifByPartnerID(pool, receiverID, senderID, "both", true, lastMsgId);
					} catch(err){
						let errMsg = "There was an error updatind the notification while saving the message: " + err;
						console.error(errMsg);
						socket.emit('newError', errMsg);
					}
				}
			}
			else{
				//console.log("has no notif", notifType);
				try{
					await dbFun.createNotif(pool, receiverID, senderID, senderName, "msg", lastMsgId);
				} catch(err){
					let errMsg = "There was an error creating the notification while saving the message: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg);
				}
			}
		}

		resHandler();

		let existBool;

		try{
			existBool = await dbFun.checkChatTableExist(pool, senderID, receiverID);
		} catch(err){
			let errMsg = "Message was not saved. There was an error checking whether chat table exists: " + err;
			console.error(errMsg);
			socket.emit('newError', errMsg);
		}

		if(!existBool){
			try{
				await dbFun.createChatTable(pool, senderID, receiverID);
			} catch(err){
				let errMsg = "Message was not saved. There was an error creating new chat table: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg);
			}
		}
			
		try{
			await dbFun.saveChatSingle(pool, senderID, receiverID, input);
		} catch(err){
			let errMsg = "There was an error saving the message: " + err;
			console.error(errMsg);
			socket.emit('newError', errMsg);
		}
	});


	socket.on('updateMsgNotif', async (partnerName) => {
		//console.log("not chatting, creating notif")
		/*user is not currently chatting with partner, so create a notification entry for partner in user's notifs*/
		let partnerID, notifCheck;
		let userID = socketIDObj[socket.id];

		if(usernameObj[partnerName]){
			partnerID = usernameObj[partnerName];
		}
		else{
			try{
				let userObj = await dbFun.getUserByName(pool, partnerName);
				partnerID = userObj.id;
			} catch(err){
				let errMsg = "There was an error getting partner ID while updating message notification: "+ err
				console.error(errMsg);
				socket.emit('newError', errMsg); 
			}
		}

		try{
			notifCheck = await dbFun.checkNotifTypeByPartnerID(pool, userID, partnerID);
		} catch(err){
			let errMsg = "There was an error getting checking notification type while updating message notification: "+ err
			console.error(errMsg);
			socket.emit('newError', errMsg); 
		}

		/*If a notification exists, check if it's it's "fr" and update if so*/
		if(notifCheck){
			if(notifCheck == "fr"){
				//console.log("has an fr, changing to both")
				let newMsgId;

				try{
					newMsgId = await dbFun.getLastMsgID(pool, userID, partnerID);
				} catch(err){
					let errMsg = "There was an error getting last message ID while updating message notification: "+ err
					console.error(errMsg);
					socket.emit('newError', errMsg); 
				}

				try{
					await dbFun.updateNotifByPartnerID(pool, userID, partnerID, "both", true, newMsgId);
				} catch(err){
					let errMsg = "There was an error while updating message notification: "+ err
					console.error(errMsg);
					socket.emit('newError', errMsg); 
				}
			}
		}
		else{ //otherwise create new notif
			let newMsgId;
			//console.log("has none notif, creating new")
			try{
				newMsgId = await dbFun.getLastMsgID(pool, userID, partnerID);
			} catch(err){
				let errMsg = "There was an error getting last message ID while updating message notification: "+ err
				console.error(errMsg);
				socket.emit('newError', errMsg); 
			}

			//console.log("DATA", userID, partnerID, partnerName, newMsgId)
			try{
				await dbFun.createNotif(pool, userID, partnerID, partnerName, 'msg', newMsgId);
			} catch(err){
				let errMsg = "There was an error getting checking notification type while updating message notification: "+ err
				console.error(errMsg);
				socket.emit('newError', errMsg); 
			}
		}

	})


	socket.on('sendFR', async (receiverName) => {
		let senderID = socketIDObj[socket.id];
		let senderName = userIDObj[senderID];
		let receiverID = usernameObj[receiverName];
		let receiverSocket = uidObj[receiverID];
		let currNotifType;

		if(receiverSocket){
			socket.to(receiverSocket).emit('inFR', senderName);
		}

		try{
			currNotifType = await dbFun.checkNotifTypeByPartnerID(pool, receiverID, senderID)
		} catch(err){
			let errMsg = "There was an error getting the notification while sending the friend request: " + err;
			console.error(errMsg);
			socket.emit('newError', errMsg);
		}

		if(currNotifType){
			//if the current notif is msg, change it to both, else leave it be
			//console.log('updating notif for fr');
			if(currNotifType == "msg"){
				try{
					await dbFun.updateNotifByPartnerID(pool, receiverID, senderID, "both", false, null);
				} catch(err){
					let errMsg = "There was an error updating the notification while saving the message: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg);
				}
			}
		}
		else { 
			//if the notif entry for the sender does not exist, create one and set it as 'fr'
				//console.log('creating notif as fr');
				try{
					await dbFun.createNotif(pool, receiverID, senderID, senderName, "fr", null);
				} catch(err){
					let errMsg = "There was an error creating the notification while saving the message: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg);
				}
		}
	});


	socket.on('acceptFR', async (partnerName, updateHandler) => {
		let userID = socketIDObj[socket.id];
		let username = userIDObj[userID];
		let partnerID, notifType;

		if(usernameObj[partnerName]){
			partnerID = usernameObj[partnerName];
		}
		else{
			try{
				partnerID = await dbFun.getUserByName(pool, partnerName);
				partnerID = partnerID.id;
			} catch(err){
				let errMsg = "There was an error getting your friend's ID while accepting FR: " + err;
				console.error(errMsg);
				socket.emit('newError', errMsg)
			}
		}

		//console.log(partnerName, partnerID, 'FR has been accepted');
		
		try{
			notifType = await dbFun.checkNotifTypeByPartnerID(pool, userID, partnerID)
		} catch(err){
			let errMsg = "There was an error checking notifications while accepting FR: " + err;
			console.error(errMsg);
			socket.emit('newError', errMsg);
		}

		if(notifType){		//updates the notifaction list for the accepting user
			if(notifType == "both"){
				try{
					await dbFun.updateNotifByPartnerID(pool, userID, partnerID, "msg", false, null);
				} catch(err){
					let errMsg = "There was an error updating notifications while accepting FR: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg)
				}
			}
			else if(notifType == "fr"){
				try{
					await dbFun.clearNotificationByPartnerID(pool, userID, partnerID);
				} catch(err){
					let errMsg = "There was an error clearing notifications while accepting FR: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg)
				}
			}
		}

		//does a check for the sender as well, just in case
		let senderNotif;

		try{
			senderNotif = await dbFun.checkNotifTypeByPartnerID(pool, partnerID, userID);
		} catch(err){
			let errMsg = "There was an error chekcing notifications for your friend while accepting FR: " + err;
			console.error(errMsg);
			socket.emit('newError', errMsg)
		}

		if(senderNotif){
			if(senderNotif == "both"){
				try{
					await dbFun.updateNotifByPartnerID(pool, partnerID, userID, "msg", false, null);
				} catch(err){
					let errMsg = "There was an error updating your friend's notifications while accepting FR: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg)
				}
			}
			else if(senderNotif == "fr"){
				try{
					await dbFun.clearNotificationByPartnerID(pool, userID, partnerID);
				} catch(err){
					let errMsg = "There was an error clearing your friends notifications while accepting FR: " + err;
					console.error(errMsg);
					socket.emit('newError', errMsg)
				}
			}
		}

		try{ 
			await dbFun.addFriend(pool, userID, partnerID, partnerName);
			await dbFun.addFriend(pool, partnerID, userID, username);
		} catch(err){
			let errMsg = "There was an error adding user to your friends list: " + err;
			console.error(errMsg);
			socket.emit('newError', errMsg)
		}

		if(uidObj[partnerID]){
			socket.to(uidObj[partnerID]).emit('FRAccepted', username);
		}

		updateHandler();
	});


	socket.on('removeFriend', async (friendName, updateHandler) => {
		let userID = socketIDObj[socket.id];
		let friendID;

		try{
			let userObj = await dbFun.getUserByName(pool, friendName);
			friendID = userObj.id;
		} catch(err){
			let errMsg = "There was an error getting friend info for removal: "+err
			console.error(errMsg);
			updateHandler(false, errMsg);
		}

		try{
			await dbFun.removeFriendByID(pool, userID, friendID);
			await dbFun.removeFriendByID(pool, friendID, userID);
		} catch(err){
			let errMsg = "There was an error removing friend from list: "+err
			console.error(errMsg);
			updateHandler(false, errMsg);
		}

		//console.log("deleting friend ",friendID);
		updateHandler(true, null);
	})


	socket.on('disconnect', (msgArr, partnerID) => {
		let uid = socketIDObj[socket.id];
		let uname = userIDObj[uid];

		usersArr.splice(usersArr.indexOf(uname), 1);
		delete usernameObj[uname];
		delete uidObj[uid];
		delete userIDObj[uid];
		delete socketIDObj[socket.id];

		//console.log("DISCONNECT", uidObj, userIDObj, socketIDObj, usersArr)

		socket.broadcast.emit('userLeft', uname);
		//socket.broadcast.emit('updateUsers', usersArr);
		//console.log("User disconnected: " + socket.id, msgArr);
	});
})

server.listen(PORT, () => 
	console.log("Node server is running on PORT " + PORT)
);