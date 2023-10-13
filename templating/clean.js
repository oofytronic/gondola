/* Erase area of any nodes
	@params {string} location - location to be cleaned before reinsertion
*/
export function clean(location) {
	const area = document.querySelector(location);

	while (area.firstChild) {
		area.removeChild(area.firstChild);
	}
}