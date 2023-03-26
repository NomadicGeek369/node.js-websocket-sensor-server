const WebSocket = require('ws');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const fluidb = require('fluidb');
const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const MockModel = require('./test/mock-model');

let testMode = true;
let sensor;
let command = null;
const threshold = 0.7;
const frequency = 20;
let validEntities = [];
let counter = 0;
let initialDataReceived;
let resolveInitialData;

initialDataReceived = new Promise((resolve) => {
	resolveInitialData = resolve;
});

fs.readdir('./images', { withFileTypes: true }, (err, files) => {
	if (err) {
		console.error(err);
		return;
	}
	
	validEntities = files.filter(file => file.isDirectory()).map(folder => folder.name);
});

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

process.on('message', (message) => {
	if (message.update === 'sensor') {
		sensor = message.data;
		console.log('Connection prepared for', sensor);
		
		resolveInitialData();
	} else if (message.update === 'command') {
		command = message.data;
		console.log('Command to be executed for', sensor);
	}
});

async function loadModel(testMode = false) {
	console.log("loadModel called");
	if (testMode) {
		console.log("Using MockModel");
		return new MockModel();
	}
	return await cocoSsd.load();
}

async function main() {
	await initialDataReceived;
	
	const model = await loadModel(testMode);
	console.log(`AI Model - Done`);
	console.log('Connection started for', sensor);
	
	if (!sensor) {
		process.exit();
	}
	
	const server = new WebSocket.Server({ port: sensor.port }, () => console.log(`WS Server is listening at ${sensor.port}`));
	server.on('connection', (ws) => {
		ws.on('message', async (data) => {
			if (ws.readyState !== ws.OPEN) return;
			
			if (command) {
				ws.send(command);
				command = null;
			}
			
			if (typeof data === 'object') {
				let img = Buffer.from(Uint8Array.from(data)).toString('base64');
				counter++;
				if (counter === frequency) {
					counter = 0;
					
					let imgTensor = tf.node.decodeImage(new Uint8Array(data), 3);
					
					const predictions = await model.detect(imgTensor);
					predictions.forEach((prediction) => {
						console.log(prediction.class + ' - ' + prediction.score);
						if (validEntities.includes(prediction.class) && prediction.score > threshold) {
							new fluidb(`./images/${prediction.class}/${Date.now()}`, { 'score': prediction.score, 'img': img, 'bbox': prediction.bbox });
						}
					});
					tf.dispose([imgTensor]);
				}
				sensor.image = img;
			} else {
				const commandRegex = /\(c:(.*?)\)/g;
				const sensorRegex = /\(s:(.*?)\)/g;
				let match;
				
				while ((match = commandRegex.exec(data))) {
					const keyValuePairs = match[1];
					const pairs = keyValuePairs.trim().split(/\s*,\s*/);
					
					for (const pair of pairs) {
						const [key, value] = pair.split("=");
						const commandFind = sensor.commands.find(c => c.id === key);
						if (commandFind) {
							commandFind.state = value;
						}
					}
				}
				
				const sensorsObj = {};
				while ((match = sensorRegex.exec(data))) {
					const keyValuePairs = match[1];
					const pairs = keyValuePairs.trim().split(/\s*,\s*/);
					
					for (const pair of pairs) {
						const [key, value] = pair.split("=");
						sensorsObj[key] = value;
					}
				}
				
				sensor.sensors = sensorsObj;
			}
			
			process.send({ update: 'sensor', data: sensor });
		});
	});
}

main();

