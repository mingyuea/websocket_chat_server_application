const http = require('http');
const static = require('node-static');
const crypto = require('crypto');
const file = new static.Server('./static');

const PORT = 5000;

const server = http.createServer((req, res) => {
	req.addListner('end', () => file.server(req, res)).resume();
});

server.on('upgrade', (req, socket) => {
	console.log(req);

	if(req.headers['Upgrade'] !== "websocket"){
		socket.end('HTTP/1.1 400 Bad Request');
		return;
	}

	const acceptKey = req.headers['sec-websocket-key'];
	const acceptHash = generateValue(acceptKey);
	const resHeaders = [ 'HTTP/1.1 101 Web Socket Protocol Handshake', 'Upgrade: WebSocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${acceptHash}` ];
	
	let protocols = req.headers['sec-websocket-protocol'];
	protocols = !protocols ? [] : protocols.split(',').map(name => name.trim());

	if(protocols.include('json')){
		resHeaders.push(`Sec-WebSocket-Protocol: json`);
	}

	socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
})

function generateValue(key){
	let acceptVal = crypto.createHash('sha1').update(key + '258EAFA5-E914–47DA-95CA-C5AB0DC85B11', 'binary').digest('base64');
	return acceptVal;
}

server.listen(PORT, () => console.log("Node server is running on PORT " + PORT));