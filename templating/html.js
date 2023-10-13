/* Create clean html for javascript templating
	@params {Array} strings - an array of strings from a template literal
	@params {Array} ...values - an array of expressions from a template literal

	@return {HTML} template - returns a clean version of the template literal
*/

// import { purify } from './helpers/DOMpurify.js';

export function html(strings, ...values) {
	let template = '';
	// const dirty = strings.reduce((prev, next, i) => `${prev}${next}${values[i] || ''}`, '');
	// return purify.sanitize(dirty);
	strings.forEach((string, i) => {
		template += string + (values[i] || '');
	});

	return template;
}

// function sanitize(strings, ...values) {
//     const dirty = strings.reduce((prev, next, i) => `${prev}${next}${values[i] || ''}`, '');
//     return DOMPurify.sanitize(dirty);
// }