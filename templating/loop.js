/* Render Function for Javascript Templating
	@params {HTML} collection - pulls data from a specific collection
	@params {String} element - html element tag to be used in iteration
	@params {String} glue - any string value to be used to join each mapped element | default value is an empty string
	
	@return {HTML} returns a template string to later be parsed by the Cycles html function
*/
export function loop(collection, element, glue = '') {
	// Define what element will be mapped and iterated
	// // MAP a collection of data which is presented as an array
	if (element === 'p') {
		return collection.map(data => `<p>${data}</p>`).join(glue);
	} else if (element === 'div') {
		return collection.map(data => `<div>${data}</div>`).join(glue);
	} else if (element === 'ul') {
		return `<ul>${collection.map(data => `<li>${data}</li>`).join(glue)}</ul>`;
	}

}