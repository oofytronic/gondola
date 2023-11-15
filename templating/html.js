export function html(strings, ...values) {
	function sanitize(string) {
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#x27;',
			"/": '&#x2F;',
		};
		const reg = /[&<>"'/]/ig;
		return string.replace(reg, (match) => (map[match]));
	}

	return strings.reduce((result, string, i) => {
		let value = values[i - 1];
		if (value instanceof Array) {
			value = value.join('');
		} else if (value && typeof value === 'object') {
			value = JSON.stringify(value, null, 2);
		}
		return result + sanitize(String(value)) + string;
	});
}