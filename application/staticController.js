const express = require('express');
const router = express.Router();
const path = require('path');

router.use('/static', express.static(path.join(__dirname, "..", "static")));

router.get('/static/auth', (req, res) => {
	if(req.cookies.uid){
		res.redirect('/static/home');
	}
	else{
		res.sendFile(path.join(__dirname, "..", "static", 'auth.html'));
	}
});

router.get('/static/home', (req, res) => {
	if(req.cookies.uid){
		res.sendFile(path.join(__dirname, "..", "static", 'index.html'));
	}
	else{
		res.redirect('/static/auth');
	}
});


module.exports = router;