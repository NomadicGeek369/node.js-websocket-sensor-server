const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const tf = require('@tensorflow/tfjs-node');
const fluidb = require('fluidb');
let sensors = require('./sensors.json');

const app = express();

app.use('/static', express.static(path.join(__dirname, 'public')));

const validEnteties = ['cat', 'dog', 'person', 'laptop'];
let connectedClients = [];
const HTTP_PORT = 8000;

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

			try {
				data = JSON.parse(data);
			
				if(data.operation === 'function') {
					if(sensors[data.command.recipient]) {
						sensors[data.command.recipient].command = data.command.message.key + '=' + data.command.message.value;
					}
					console.log(data);
				}
			} catch (error) {}
		});
	});


	// Sensors
	Object.entries(sensors).forEach(([sensorKey]) => {
		const connection = sensors[sensorKey];
		
		new WebSocket.Server({port: connection.port}, () => console.log(`WS Server is listening at ${connection.port}`)).on('connection',(ws) => {
			ws.on('message', data => {
				if (ws.readyState !== ws.OPEN) return;

				if (connection.command) {
					console.log('sending');
					ws.send(connection.command);
					connection.command = null; // consume
				}

				if (typeof data === 'object') {
					let img = Buffer.from(Uint8Array.from(data)).toString('base64');
					connection.counter++;

					if (connection.counter === connection.frequency) {
						connection.counter = 0;
						let imgTensor = tf.node.decodeImage(new Uint8Array(data), 3);

						model.detect(imgTensor).then((predictions) => {
							predictions.forEach((prediction) => {
								console.log(prediction.class+' - '+prediction.score);
								if (validEnteties.includes(prediction.class) && prediction.score > connection.threshold) {
									new fluidb('./images/'+prediction.class+'/'+Date.now(), {'score': prediction.score, 'img': img, 'bbox': prediction.bbox});
								}
							});
							tf.dispose([imgTensor]);
						});
					}
					connection.image = img;
				} else {
					let sensorData = data;

					if (data.includes(';')) {
						let dataArray = data.split(";");
						sensorData = dataArray[0].split("=")[1];
						let states = dataArray[1].split(":")[1].split(",");
						
						states.forEach(state => {
							let [key, value] = state.split("=");
							const commandFind = connection.commands.find(c => c.id === key);
					
							if (commandFind) { 
								commandFind.state = value; 
							}
						});
					}

					connection.sensors = sensorData.split(",").reduce((acc, item) => {
						const key = item.split("=")[0];
						const value = item.split("=")[1];
						acc[key] = value;
						return acc;
					}, {});
				}

				connectedClients.forEach(client => {
					client.send(JSON.stringify({ devices: sensors }));
				});
			});
		});
	});
});

app.get('/client',(_req,res)=>{ res.sendFile(path.resolve(__dirname,'./public/client.html')); });
app.listen(HTTP_PORT,()=>{ console.log(`HTTP server starting on ${HTTP_PORT}`); });