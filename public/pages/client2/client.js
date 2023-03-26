const ws = new WebSocket('ws://192.168.0.150:8999');

ws.addEventListener('open', (event) => {
	ws.send(JSON.stringify({
		'client': '8999',
		'operation': 'connecting',
		'data': {}
	}));
});

ws.onmessage = message => {
	let md = JSON.parse(message.data);

	md.devices.forEach(device => {
		if (!document.querySelector('#' + device.key)) {
			document.querySelector('#main-wrapper')
				.appendChild(createElement('div',{ id: device.key, class: device.class + ' item' }))
				.appendChild(createElement('h2',{ id: device.key + '-header', class: 'sensors-header' }, device.display));
			if (device.class === 'cam-instance') {
				document.querySelector('#'+device.key) 
					.appendChild(createElement('div',{ id:'wrap-' + device.key + '-image', class: 'image-wrapper' }))
					.appendChild(createElement('img',{ id:'img-' + device.key }));
			}
			document.querySelector('#'+device.key)
				.appendChild(createElement('div',{ id:'wrap-' + device.key + '-sensors', class:'sensors-wrapper-' + device.view }));
			document.querySelector('#'+device.key)
				.appendChild(createElement('div',{ id:'wrap-' + device.key + '-commands', class:'commands-wrapper-' + device.view }));
		}
		
		if (device.image) {
			document.querySelector('#img-' + device.key).src = "data:image/jpeg;base64," + device.image;
		}

		try {
			console.log(device.sensors);
			for (const [key, value] of Object.entries(device.sensors)) {
				if (!document.querySelector('#' + device.key + '-' + key)) {
					document.querySelector('#wrap-' + device.key + '-sensors')
						.appendChild(createElement('div', { id: device.key + '-' + key.toLowerCase(), class: 'sensor sensor-' + key.toLowerCase() }));
				}
				
				document.querySelector('#' + device.key + '-' + key.toLowerCase()).innerHTML = value;
			}
		} catch (error) {}
		
		if(device.commands) {
			device.commands.forEach((command) => {
				if (!document.querySelector('#' + device.key + '-' + command.id)) {
					console.log('jupp');
					document.querySelector('#wrap-' + device.key + '-commands')
						.appendChild(createElement('div', { 
							id: device.key + '-' + command.id, 
							class: 'command-button'
					})).appendChild(createElement('div',{ 
						id: device.key + '-' + command.id.toLowerCase() + '-state', class: command.class, 
						'data-state': command.state
					}));
	
					document.querySelector('#' + device.key + '-' + command.id.toLowerCase()).addEventListener('click', function(e) {
						ws.send(JSON.stringify({
							'client' : '8999',
							'operation' : 'function',
							'command': {'recipient' : device.key, 'message' : { key: command.id, value: e.target.dataset.state == 1 ? 0 : 1 }}
						}));
					});
				} else {
					// Has any state changed?
					let element = document.querySelector('#' + device.key + '-' + command.id + '-state');
	
					if (element && command.state != element.dataset.state) {
						element.dataset.state = command.state;
					}
				}
			});
		}
	});
}
