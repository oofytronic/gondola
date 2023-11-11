#!/usr/bin/env bun
import {Gondola} from './lib.js';

// Function to parse command line arguments
function parseArgs() {
    const args = Bun.argv;
    const serveIndex = args.indexOf('--serve');
    return {
        serve: serveIndex !== -1
        // Add more arguments as needed
    };
}

// Main function to handle commands
async function main() {
    const args = parseArgs();

    if (args.serve) {
        // Extract additional options if needed
        const port = 3000;  // Default port, you can make this configurable
        Gondola('./').gen();
        Gondola('./').serve(port);
    } else {
    	Gondola('./').gen();
    }

    // Add more conditions for other commands
}

main();