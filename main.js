#!/usr/bin/env bun
import {Gondola} from './lib.js';

function parseArgs() {
	const args = Bun.argv;
	const serve_index = args.indexOf('--serve');
	let port = 8080; // Default port

	// If --serve is present, look for --port and its subsequent value
	if (serve_index !== -1) {
		const port_index = args.indexOf('--port', serve_index);
		if (port_index !== -1 && args.length > port_index + 1) {
			const port_arg = parseInt(args[port_index + 1], 10);
			if (!isNaN(port_arg)) {
				port = port_arg; // Use the provided port number if valid
			}
		}
	}

	return {
		serve: serve_index !== -1,
		port: port
	};
}

async function main() {
	const args = parseArgs();
	const gondola_instance = Gondola('./');

	await gondola_instance.gen();

	if (args.serve) {
		await gondola_instance.serve(args.port);
	}
}

main();