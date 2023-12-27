export function typeCheck(value, expectedType) {
	function getType(val) {
		if (val === null) return 'null';
		if (Array.isArray(val)) return 'array';
		if (val instanceof Date) return 'date';
		if (val instanceof Promise) return 'promise';
		if (val instanceof Map) return 'map';
		if (val instanceof Set) return 'set';
		if (val instanceof RegExp) return 'regexp';
		if (typeof val === 'function') return 'function';
		if (val instanceof Error) return 'error';
		if (ArrayBuffer.isView(val) && !(val instanceof DataView)) return 'typedarray';
		if (val instanceof HTMLElement) return 'htmlelement';
		
		return typeof val;
	}

	const actualType = getType(value);

	if (actualType !== expectedType) {
		console.error(`Type error: expected ${expectedType}, but got ${actualType}`);
		return false;
	}

	return true;
}