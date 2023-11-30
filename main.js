#!/usr/bin/env bun
import {Gondola} from './lib.js';

function parseArgs() {
	const args = Bun.argv;
	const serve_index = args.indexOf('--serve');
	const port_index = serve_index !== -1 ? args.indexOf('--port', serve_index) : -1;
	const port = port_index !== -1 && port_index + 1 < args.length ? parseInt(args[port_index + 1], 10) : 8080;

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