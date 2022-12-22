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
				.appendChild(createElement('div',{ id:'wrap-' + device + '-sensors', class:'sensors-wrapper-' + md.devices[device].view }))
		}
		
		if (md.devices[device].image) {
			document.querySelector('#img-' + device).src = "data:image/jpeg;base64," + md.devices[device].image;
		}
		
		for (const [key, value] of Object.entries(md.devices[device].sensors)) {
			console.log(`${key}: ${value}`);
			if (!document.querySelector('#' + device + '-' + key)) {
				document.querySelector('#wrap-' + device + '-sensors')
					.appendChild(createElement('div', { id: device + '-' + key, class: 'sensor sensor-' + key }));
			}
			
			document.querySelector('#' + device + '-' + key).innerHTML = value;
		}
	}
}
