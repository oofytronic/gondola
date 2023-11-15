export function loop(strings, data, template) {
	return data.map(article => {
		return template.replace(/\$\{(\w+)\}/g, (match, propertyName) => {
			return article[propertyName] || match;
		});
	}).join('');
}