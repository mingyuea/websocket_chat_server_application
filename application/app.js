const http = require('http');
const static = require('node-static');
const crypto = require('crypto');
const fileServer = new static.Server('./application');

const PORT = 5000;

const server = http.createServer((req, res) => {
	req.addListener('end', () => fileServer.serve(req, res)).resume();
});

server.on('upgrade', (req, socket) => {
	//console.log(req);

	if(req.headers['upgrade'] !== "websocket"){
		socket.end('HTTP/1.1 400 Bad Request');
		return;
	}

	let acceptKey = req.headers['sec-websocket-key'];
	const acceptHash = generateValue(acceptKey);

	console.log('acceptkey', acceptKey, 'hash', acceptHash, 'nk', newKey);
	
	const resHeaders = [ 'HTTP/1.1 101 Web Socket Protocol Handshake', 'Upgrade: WebSocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${acceptHash}` ];
	

	let protocols = req.headers['sec-websocket-protocol'];
	protocols = !protocols ? [] : protocols.split(',').map(name => name.trim());

	if(protocols.includes('json')){
		console.log('json here');
		resHeaders.push('Sec-WebSocket-Protocol: json');
	}

	console.log(resHeaders);

	socket.write(resHeaders.join('\r\n')/* + '\r\n\r\n'*/);
	//console.log(socket);
})

function generateValue(key){
	//let acceptVal = crypto.createHash('sha1').update(key + '258EAFA5-E914–47DA-95CA-C5AB0DC85B11', 'binary').digest('base64');
	//return acceptVal;
	return crypto
	  .createHash('sha1')
	  .update(key + '258EAFA5-E914–47DA-95CA-C5AB0DC85B11', 'binary')
	  .digest('base64');
}

server.listen(PORT, () => console.log("Node server is running on PORT " + PORT));