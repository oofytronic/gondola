import { clean } from './clean.js';

/* Render Function for Javascript Templating
	@params {HTML} template - pulls template from html tag function
	@params {String} location - a css selector string used to determine where the template is rendered
	
	@return {HTML} renders a template to a specific location
*/
export function render(template, location, option) {
	let range = document.createRange();
	let parentNode = document.querySelector(location);
	const element = range.createContextualFragment(template);

	if(option ==='clean') {
		clean(location);
	}
	parentNode.appendChild(element);
}