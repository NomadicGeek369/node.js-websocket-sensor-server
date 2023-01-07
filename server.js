const path = require('path');
const express = require('express');
const WebSocket = require('ws');

const app = express();

app.use('/static', express.static(path.join(__dirname, 'public')));

let connectedClients = [];
const HTTP_PORT = 8000;

let connections = {
	test1: { port: 8885, class: 'cam-instance', display: 'Cam #1', view: 'overlay' },
	gas1: { port: 8887, display: 'Cabin gas', class: 'gas-sensor', view: 'overlay' },
	gas2: { port: 8886, display: 'Electric gas', class: 'gas-sensor', view: 'overlay' },
};

// Clients
const wss = new WebSocket.Server({port: '8999'}, () => console.log(`WS Server is listening at 8999`));

wss.on('connection', ws => {
	ws.on('message', data => {
		if (ws.readyState !== ws.OPEN) return;
		connectedClients.push(ws);
	});
});


// Sensors
Object.entries(connections).forEach(([key, settings]) => {
	const connection = connections[key];
	connection.sensors = {};
	
	new WebSocket.Server({port: settings.port}, () => console.log(`WS Server is listening at ${settings.port}`)).on('connection',(ws) => {
		ws.on('message', data => {
			if (ws.readyState !== ws.OPEN) return;
			if (typeof data === 'object') {
				connection.image = Buffer.from(Uint8Array.from(data)).toString('base64');
			} else {
				connection.sensors = data.split(",").reduce((acc, item) => {
					const key = item.split("=")[0];
					const value = item.split("=")[1];
					acc[key] = value;
					return acc;
				}, {});
			}

			connectedClients.forEach(client => {
				client.send(JSON.stringify({ devices: connections }));
			});
		});
	});
});

app.get('/client',(_req,res)=>{ res.sendFile(path.resolve(__dirname,'./public/client.html')); });
app.listen(HTTP_PORT,()=>{ console.log(`HTTP server starting on ${HTTP_PORT}`); });