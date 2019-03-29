const sql = require('sql');
sql.setDialect('postgres');

const tableNameRule = function(userID1, userID2){
	return (Number(userID1) > Number(userID2)) ? 'u'+userID2+'u'+userID1 : 'u'+userID1+'u'+userID2;
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
	let newQuery = 'SELECT * FROM userAuth WHERE username = %1';
	let values = [username];

	try{
		result = await pool.query(newQuery, values);
	} catch(err){
		console.error(err.stack);
		return err.stack;
	}

	return result.rows[0];
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
	let res;

	try{
		res = await pool.query(insertStmnt, values);
	} catch(err){
		return "There was an error creating a database entry for your user: " + err.stack;
	}

	return res.rows[0];
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
		//console.log("Exists", res.rows);
		return true;
	}
	else{
		//console.log("Not exists", res.rows);
		return false;
	}
}

module.exports.checkTableExist = async (pool, userID1, userID2) => {
	let tableName = tableNameRule(userID1, userID2);
	let searchQuery = 'SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = $1 AND tablename = $2)';
	let values = ['public', tableName];
	console.log(tableName);
	try{
		res = await pool.query(searchQuery, values);
	} catch(err){
		return "There was an error checking for tables in the database: " + err.stack;
	}

	return res.rows[0];
}

module.exports.createChatTable = async (pool, userID1, userID2) => {
	let tableName = tableNameRule(userID1, userID2);

	const createStmnt = "CREATE TABLE IF NOT EXISTS "+tableName+"(id serial PRIMARY KEY, msg text, uid integer);"

	try{
		res = await pool.query(createStmnt);
	} catch(err){
		return "There was an error creating table in the database: " + err.stack;
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

	let tableName = tableNameRule(originID, partnerID);

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

/*let xx = ["afasdfgg", "zzccad df", "zcvz zcvvdda fa", "qrqwreqwr rqwer r", "fasdfadsf", "this is a test string"];
xx.includes("this is a test string");*/