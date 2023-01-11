const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const tf = require('@tensorflow/tfjs-node');
const fluidb = require('fluidb');

const app = express();

app.use('/static', express.static(path.join(__dirname, 'public')));

const validEnteties = ['cat', 'dog', 'person', 'laptop'];
let connectedClients = [];
const HTTP_PORT = 8000;

let connections = {
	test1: { port: 8885, class: 'cam-instance', display: 'Cam #1', view: 'overlay', counter: 0, threshold: 0.7, frequency: 20 },
	gas1: { port: 8887, display: 'Cabin gas', class: 'gas-sensor', view: 'overlay' },
	gas2: { port: 8886, display: 'Electric gas', class: 'gas-sensor', view: 'overlay' },
};

process.on('uncaughtException', (error, origin) => {
	console.log('----- Uncaught exception -----');
	console.log(error);
	console.log('----- Exception origin -----');
	console.log(origin);
	console.log('----- Status -----');
	console.table(tf.memory());
});

process.on('unhandledRejection', (reason, promise) => {
	console.log('----- Unhandled Rejection -----');
	console.log(promise);
	console.log('----- Reason -----');
	console.log(reason);
	console.log('----- Status -----');
	console.table(tf.memory());
});

async function loadModel() {
	console.log(`AI Model - Loading`);
	return await cocoSsd.load();
}

loadModel().then(model => {
	console.log(`AI Model - Done`);

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
					let img = Buffer.from(Uint8Array.from(data)).toString('base64');
					settings.counter++;

					if (settings.counter === settings.frequency) {
						settings.counter = 0;
						let imgTensor = tf.node.decodeImage(new Uint8Array(data), 3);

						model.detect(imgTensor).then((predictions) => {
							predictions.forEach((prediction) => {
								console.log(prediction.class+' - '+prediction.score);
								if (validEnteties.includes(prediction.class) && prediction.score > settings.threshold) {
									new fluidb('./images/'+prediction.class+'/'+Date.now(), {'score': prediction.score, 'img': img, 'bbox': prediction.bbox});
								}
							});
							tf.dispose([imgTensor]);
						});
					}
					connection.image = img;
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
});

app.get('/client',(_req,res)=>{ res.sendFile(path.resolve(__dirname,'./public/client.html')); });
app.listen(HTTP_PORT,()=>{ console.log(`HTTP server starting on ${HTTP_PORT}`); });