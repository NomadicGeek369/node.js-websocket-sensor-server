const createElement = (e, a, i) => {
	if (!e) return false;
	if (!i) i = "";
	let el = document.createElement(e);
	if (a) {
		for (const [k, v] of Object.entries(a)) {
			el.setAttribute(k, v);
		}
	}
	if (!Array.isArray(i)) i = [i];
	for (const item of i) {
		if (item.tagName) {
			el.appendChild(item);
		} else {
			el.appendChild(document.createTextNode(item));
		}
	}
	return el;
};
