const sql = require('sql');
sql.setDialect('postgres');

const tableNameResolver = function(userID1, userID2){
	return (Number(userID1) > Number(userID2)) ? String('u'+userID2+'u'+userID1) : String('u'+userID1+'u'+userID2);
}

module.exports.test = async (pool) => {
	let client = await pool.connect();
	let result;

	try{
		result = await client.query('SELECT * FROM userAuth');
	} catch(err){
		console.error(e.stack);
		client.release();
	} finally {
		client.release();
	}

	return result.rows[0];
}

module.exports.getUserByName = async (pool, username) => {
	let result;
	let newQuery = 'SELECT * FROM userAuth WHERE username = $1';
	let values = [username];

	try{
		result = await pool.query(newQuery, values);
	} catch(err){
		console.error(err.stack);
		return err.stack;
	}

	return result.rows[0];
}

module.exports.getUsernameByID = async (pool, uid) => {
	let result;
	let query = 'SELECT username FROM userauth WHERE id = $1';
	let values = [uid];

	try{
		result = await pool.query(query, values);
	} catch(err){
		console.error(err.stack);
		return err.stack;
	}

	return result.rows[0].username;
}

module.exports.getHashByName = async (pool, username, pass) => {
	let query = 'SELECT id, hash FROM userauth WHERE username = $1';
	let values = [username.toLowerCase()];
	let res;

	try{
		res = await pool.query(query, values);
	} catch(err){
		return "There was an error querying user database: " + err.stack;
	}

	return res.rows[0];
}

module.exports.register = async (pool, username, hash) => {
	let insertStmnt = 'INSERT INTO userauth(username, hash) VALUES ($1, $2) RETURNING id';
	let values = [username.toLowerCase(), hash];
	let res, newID;

	try{
		res = await pool.query(insertStmnt, values);
		newID = res.rows[0].id;
	} catch(err){
		return "There was an error creating a database entry for your user: " + err.stack;
	}

	let createNotif = "CREATE TABLE notif" + newID + "(notifid SERIAL, partnerid INTEGER, partnername VARCHAR(20), notiftype VARCHAR(20), PRIMARY KEY (notifid), FOREIGN KEY (partnerid) REFERENCES userauth(id))";
	
	try{
		await pool.query(createNotif);
	} catch(err){
		return "There was an error creating a notification table: " + err.stack;
	}

	let createFL = "CREATE TABLE fl" + newID + "(userid INTEGER, username VARCHAR(20), FOREIGN KEY (userid) REFERENCES userauth(id))";

	try{
		await pool.query(createFL);
	} catch(err){
		return "There was an error creating a friendslist table: " + err.stack;
	}
	return newID;
}

module.exports.checkUserExist = async (pool, username) => {
	let query = 'SELECT * FROM userauth WHERE username = $1';
	let values = [username.toLowerCase()];
	let res;

	try{
		res = await pool.query(query, values);
	} catch(err){
		return "There was an error checking the database: " + err.stack;
	}

	if(res.rows.length > 0){
		return true;
	}
	else{
		return false;
	}
}

module.exports.checkChatTableExist = async (pool, userID1, userID2) => {
	let tableName = tableNameResolver(userID1, userID2);
	let searchQuery = 'SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = $1 AND tablename = $2)';
	let values = ['public', tableName];
	//console.log(tableName);
	try{
		res = await pool.query(searchQuery, values);
	} catch(err){
		return "There was an error checking for tables in the database: " + err.stack;
	}

	/*if(res.rows.length > 0){
		return true;
	}
	else{
		return false;
	}*/
	return res.rows[0].exists;
}

module.exports.createChatTable = async (pool, userID1, userID2) => {
	let tableName = tableNameResolver(userID1, userID2);

	const createStmnt = "CREATE TABLE IF NOT EXISTS "+tableName+"(id serial PRIMARY KEY, msg text, uid integer);"

	try{
		res = await pool.query(createStmnt);
	} catch(err){
		return "There was an error creating table in the database: " + err.stack;
	}

	return;
}

module.exports.getMsgListFromChatTable = async (pool, userID1, userID2, counter) => {
	let tableName = tableNameResolver(userID1, userID2);
	let selQuery = 'SELECT msg, uid FROM (SELECT * FROM ' + tableName + ' ORDER BY id DESC LIMIT ' + String(counter * 20 + 20) + ') AS lastentrie ORDER BY id ASC';
	let result; 

	try{
		result = await pool.query(selQuery);
	} catch(err){
		return "There was an error fetching chat history: " + err.stack;
	}

	return result.rows;
}

module.exports.getNotificationsByUserID = async (pool, userID) => {
	let res;
	let fetchQuery = "SELECT * FROM notif" + userID;

	//console.log('fetchQuery is', fetchQuery);
	try{
		res = await pool.query(fetchQuery);
	}catch(err){
		return "There was an error fetching notifications: " + err.stack;
	}

	return res.rows;
}

module.exports.createNotif = async (pool, userID, partnerID, partnerName, notifType) => {
	let insertStmnt = "INSERT INTO notif"+userID+"(partnerid, partnername, notiftype) VALUES ($1, $2, $3) RETURNING notifid";
	let values = [Number(partnerID), partnerName, notifType];

	//console.log(insertStmnt, values);

	try{
		let notifID = await pool.query(insertStmnt, values);
		//console.log(notifID, "is ntifID");
	} catch(err){
		return err.stack;
	}

	return;
}

module.exports.checkNotifTypeByPartnerID = async (pool, userID, partnerID) => {
	let res;

	let searchQuery = "SELECT notiftype FROM notif" + userID + " WHERE partnerid = $1";
	let values = [Number(partnerID)];

	try{
		res = await pool.query(searchQuery, values);
	} catch(err){
		return err.stack;
	}

	if(res.rows.length > 0){
		return res.rows[0].notiftype;
	}
	else{
		return false;
	}
}

module.exports.clearNotificationByNotifID = async (pool, userID, notifID) => {
	let delStmnt = "DELETE FROM notif"+userID+" WHERE notifid = $1";
	let values = [Number(notifID)];

	try{
		await pool.query(delStmnt, values);
	}catch(err){
		return "There was an error clearing a notification: " +err.stack
	}

	return;
}

module.exports.clearNotificationByPartnerID = async (pool, userID, partnerID) => {
	let delStmnt = "DELETE FROM notif"+userID+" WHERE partnerid = $1";
	let values = [Number(partnerID)];

	try{
		await pool.query(delStmnt, values);
	}catch(err){
		return "There was an error clearing a notification: " +err.stack
	}

	return;
}

module.exports.updateNotifByPartnerID = async (pool, userID, partnerID, newState) => {
	let updateStmt = "UPDATE notif" + userID + " SET notiftype = $1 WHERE partnerid = $2";
	let values = [newState, Number(partnerID)];

	try{
		await pool.query(updateStmt, values);
	} catch(err){
		return err.stack;
	}

	return;
}

module.exports.saveChatSingle = async (pool, originID, partnerID, msg) => {
	let tableName = tableNameResolver(originID, partnerID);
	let insertStmnt = "INSERT INTO "+tableName+" (msg, uid) VALUES ($1, $2)";
	let values = [msg, Number(originID)];

	try{
		await pool.query(insertStmnt, values);
	} catch(err){
		return err.stack;
	}

	return;
}

module.exports.saveChat = async (pool, originID, partnerID, msgObjArr) => {
	let updatedMsgArr = msgObjArr.map((msgObj, ind) => {
		if(msgObj.uid){
			msgObj.uid = originID;
		}
		else{
			msgObj.uid = partnerID;
		}

		return msgObj;
	});

	let tableName = tableNameResolver(originID, partnerID);

	let Msgs = sql.define({
		name: tableName,
		columns: [
			'id',
			'msg',
			'uid',
		]
	});

	let insertQuery = Msgs.insert(msgObjArr).toQuery();

	try{
		await pool.query(insertQuery);
	} catch(err){
		return "There was an error bulk inserting in the database: " + err.stack;	
	}

	return;
}

module.exports.addFriend = async (pool, userID, friendID, friendName) => {
	let insertStmnt = "INSERT INTO fl"+userID+"(userID, username) VALUES ($1, $2)";
	let values = [friendID, friendName];

	try{
		await pool.query(insertStmnt, values);
	} catch(err){
		return err.stack;
	}

	return;
}

module.exports.getFriendListByID = async (pool, userID) => {
	let getQuery = "SELECT * FROM fl"+userID;
	let result;

	try{
		result = await pool.query(getQuery);
	} catch(err){
		return err.stack;
	}

	return result.rows;
}

module.exports.removeFriendByID = async (pool, userID, friendID) => {
	let delStmnt = "DELETE FROM fl"+userID+" WHERE userid = $1";
	let value = [Number(friendID)];

	try{
		await pool.query(delStmnt, value);
	} catch(err){
		return err.stack;
	}

	return;
}

/*let xx = ["afasdfgg", "zzccad df", "zcvz zcvvdda fa", "qrqwreqwr rqwer r", "fasdfadsf", "this is a test string"];
xx.includes("this is a test string");*/