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
	
	for (const device in md.devices) {
		if (!document.querySelector('#' + device)) {
			document.querySelector('#main-wrapper')
				.appendChild(createElement('div',{ id: device, class: md.devices[device].class + ' item' }))
				.appendChild(createElement('h2',{ id: device + '-header', class: 'sensors-header' }, md.devices[device].display));
			document.querySelector('#'+device) 
				.appendChild(createElement('div',{ id:'wrap-' + device + '-image', class: 'image-wrapper' }))
				.appendChild(createElement('img',{ id:'img-' + device }));
			document.querySelector('#'+device)
				.appendChild(createElement('div',{ id:'wrap-' + device + '-sensors', class:'sensors-wrapper-' + md.devices[device].view }));
			document.querySelector('#'+device)
				.appendChild(createElement('div',{ id:'wrap-' + device + '-commands', class:'commands-wrapper-' + md.devices[device].view }));
		}
		
		if (md.devices[device].image) {
			document.querySelector('#img-' + device).src = "data:image/jpeg;base64," + md.devices[device].image;
		}
		try {
			for (const [key, value] of Object.entries(md.devices[device].sensors)) {
				//console.log(`${key}: ${value}`);
				if (!document.querySelector('#' + device + '-' + key)) {
					document.querySelector('#wrap-' + device + '-sensors')
						.appendChild(createElement('div', { id: device + '-' + key, class: 'sensor sensor-' + key }));
				}
				
				document.querySelector('#' + device + '-' + key).innerHTML = value;
			}
		} catch (error) {}

		//console.log(md.devices[device].commands);
		md.devices[device].commands.forEach((command) => {
			if (command !== undefined && !document.querySelector('#' + device + '-' + command.id)) {
				console.log(command);
				document.querySelector('#wrap-' + device + '-commands')
					.appendChild(createElement('div', { 
						id: device + '-' + command.id, 
						class: 'command-button'
				})).appendChild(createElement('div',{ 
					id: device + '-' + command.id + '-state', class: command.class, 
					'data-state': command.state
				}));

				document.querySelector('#' + device + '-' + command.id).addEventListener('click', function(e) {
					ws.send(JSON.stringify({
						'client' : '8999',
						'operation' : 'function',
						'command': {'recipient' : device, 'message' : { key: command.id, value: e.target.dataset.state == 1 ? 0 : 1 }}
					}));
				});
			} else {
				// Has any state changed?
				let element = document.querySelector('#' + device + '-' + command.id + '-state');

				if (element && command.state != element.dataset.state) {
					element.dataset.state = command.state;
				}
			}
		});
	}
}
