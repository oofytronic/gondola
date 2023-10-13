// OG source: https://dirask.com/posts/JavaScript-UUID-function-in-Vanilla-JS-1X9kgD

export class uuid {
	constructor() {
	}

	_generateNumber(limit) {
	   var value = limit * Math.random();
	   return value | 0;
	}

	_generateX() {
		var value = this._generateNumber(16);
		return value.toString(16);
	}

	_generateXes(count) {
		var result = '';
		for(var i = 0; i < count; ++i) {
			result += this._generateX();
		}
		return result;
	}

	_generateVariant() {
		var value = this._generateNumber(16);
		var variant =  (value & 0x3) | 0x8;
		return variant.toString(16);
	}

	//   pattern: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
	generate() {
  	    var result = this._generateXes(8)
  	         + '-' + this._generateXes(4)
  	         + '-' + '4' + this._generateXes(3)
  	         + '-' + this._generateVariant() + this._generateXes(3)
  	         + '-' + this._generateXes(12)
  	    return result;
	};
}