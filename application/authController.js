const express = require('express');
const bcrypt  = require('bcrypt');

const cEnc  = require('./cookieEncryptFunc.js');
const dbFun = require('./databaseFunctions.js');

const router = express.Router();
const saltRounds = 15;


router.get('/auth/temp', (req, res) =>{
	let userNum = Object.keys(users).length;
	userNum = "Anonymous:"+userNum;

	res.cookie('uid', userNum, {maxAge:720000});
	res.send({"actionSuccess": true, "redir": "/static/home"})
});


/*handles login authentication*/
router.post('/auth/login', async (req, res) => {
	console.log("login")
	let { username, password } = req.body;
	let pool = req.app.get('pool');
	let existBool, dbRes, compBool;

	//check if username even exists in db
	try{
		existBool = await dbFun.checkUserExist(pool, username);
	} catch(err){
		let errMsg = "Error checking database: " + err;
		console.error(errMsg);
		return res.send({"actionSuccess": false, "error": errMsg});
	}

	if(existBool){
		//get hash of the username
		try{
			dbRes = await dbFun.getHashByName(pool, username);
		} catch(err){
			let errMsg = "Error fetching user data: " + err;
			console.error(errMsg);
			return res.send({"actionSuccess": false, "error": errMsg});
		}
		//console.log(dbRes);

		//compate input password with hash
		try{
			compBool = await bcrypt.compare(password, dbRes.hash);
		} catch(err){
			let errMsg = "Error while verifying password: " + err;
			console.error(errMsg);
			return res.send({"actionSuccess": false, "error": errMsg});
		}

		let idEnc = cEnc.cookieEncrypt(dbRes.id, true);

		console.log(idEnc);
		if(compBool){
			res.cookie('uid', idEnc, {maxAge: 604800000});
			res.send({"actionSuccess": true});
		}
		else{
			res.send({"actionSuccess": false, "error": "Username/password combination is incorrect"});
		}
	}
	else{
		//username doesn't exist in db
		res.send({"actionSuccess": false, "error": "Username/password combination is incorrect"});
	}
});


/*handles register and saving user */
router.post('/auth/register', async (req, res) => {
	let { username, password } = req.body;
	let pool = req.app.get('pool');

	let dbRes, existBool;

	//check if username already exists
	try{
		existBool = await dbFun.checkUserExist(pool, username);
	} catch(err){
		let errMsg = "Error while checking database for existing usernames: " + err;
		console.error(errMsg);
		return res.send({"actionSuccess": false, "error": errMsg});
	}

	if(existBool){
		let errMsg = "This username has already been taken";
		console.error(errMsg);
		return res.send({"actionSuccess": false, "error": errMsg});
	}
	else{
		//generate salt and hash for password
		await bcrypt.genSalt(saltRounds, (err, salt) => {
			if(err){
				let errMsg = "Error generating salt for password: " + err;
				console.error(errMsg);
				return res.send({"actionSuccess": false, "error": errMsg});
			}

			bcrypt.hash(password, salt, async (err, hash) => {
				if(err){
					let errMsg = "Error hashing password: " + err;
					console.error(errMsg);
					return res.send({"actionSuccess": false, "error": errMsg});
				}

				try{
					dbRes = await dbFun.register(pool, username, hash);
				} catch (err){
					let errMsg = "Error storing user data: " + err;
					console.error(errMsg);
					return res.send({"actionSuccess": false, "error": errMsg});
				}

				let idEnc = dbRes.id;
				idEnc = cEnc.cookieEncrypt(idEnc, true);

				console.log(idEnc);
				res.cookie('uid', idEnc, {maxAge: 604800000});
				res.send({"actionSuccess": true, "dbRes": dbRes});
			});
		});
	}
});


router.get('/auth/logout', (req, res) => {
	//THIS SHOULD ALSO INCLUDE ALL UNSAVED DATA IN FRONTEND
	res.clearCookie('uid');
	console.log("logged out");
	res.send({"actionSuccess": true});
})

router.get('/test', async (req, res) => {
	console.log("test!");
	let { uid } = req.cookies;
	let pool = req.app.get('pool');
	let idNum = cEnc.cookieEncrypt(uid, false);

	let result = await dbFun.createChatTable(pool, idNum+1, "4");
		
	console.log(result);
	res.send({"action": true, "result": result, idNum});
});

module.exports = router;