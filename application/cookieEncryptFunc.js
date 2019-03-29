const cryptr = require('cryptr');
const Cryptr = new cryptr('mysecret');


//encrypts cookies if encryptBool is true, decrypts it if false
module.exports.cookieEncrypt = (cookieString, encryptBool) => {
	if(encryptBool){
		return Cryptr.encrypt(cookieString);
	}
	else{
		return Cryptr.decrypt(cookieString);
	}
}