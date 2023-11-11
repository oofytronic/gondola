// NODE
import * as fs from 'fs';
import * as path from 'path';

// BUN
import { serve as bunServe } from 'bun';
import { watch } from 'bun:fs';

// EXTERNAL
import {marked} from 'marked';
import * as yaml_front from "yaml-front-matter";


export function Gondola(dir) {

	function decipherSlug(data, line) {
		// let location;
		// line.location.includes('::') ? location = line.substring(0, line.indexOf('::')) : location = undefined;
		const slug_params = line.split('--');
		const slug = slug_params.map(param => data[param].replaceAll(' ', '-').replaceAll('.', '').replaceAll('&', 'and').replaceAll(':', '').toLowerCase()).join('-');
		return slug;
	}

	async function getSettings() {
		try {
			let default_settings = {
				starter: '',
				output: '_site',
				includes: '_includes',
				drafts: '_drafts',
				ignore: [
					'.git',
					'node_modules',
					'package.json',
					'bun.lockb',
					'gondola.js',
					'package-lock.json'
				],
				data: '_data'
			};

			const {default: defaultFunc} = await import(path.resolve(dir, 'gondola.js'))
			const user_settings = defaultFunc();

			let joined_settings = {};

			Object.entries(user_settings).forEach(([key, value]) => {
				if (Array.isArray(value)) {
					const default_array = Object.entries(default_settings);
					const match = default_array.find(([default_key, default_value]) => {
						return default_key === key
					})

					if (match !== undefined) {
						joined_settings[key] = [...match[1], ...value]
					} else {
						joined_settings[key] = value
					}
				} else {
					joined_settings[key] = value
				}
			})

			return {...default_settings, ...joined_settings};
		} catch (error) {
			console.error(`Error getting Settings from gondola.js:`, error);
		}
	}

	async function getFiles(settings, dir) {
		const files = [];

		async function read(dir) {
			const file_entries = await fs.promises.readdir(dir);

			const filtered_entries = file_entries
				.filter(entry => !settings.ignore.includes(entry))
				.filter(entry => !settings.pass.includes(entry))
				.filter(entry => entry !== settings.includes)
				.filter(entry => entry !== settings.output)

			await Promise.all(
				filtered_entries.map(async entry => {
					const entry_path = path.join(dir, entry);
					const stats = await fs.promises.stat(entry_path);

					async function createFileObj(file) {
						const file_path = path.join(dir, file);
						const stats = await fs.promises.stat(file_path)
						const ext = file.split('.')[1];
						const origin = path.resolve(dir, file);

						let obj = {
							name: file,
							path: file_path,
							origin: origin,
							ext: ext,
							size: stats.size,
							created: stats.birthtime,
							modified: stats.mtime,
							mode: stats.mode
						}

						if (ext === "js") {
							try {
								const {config: configFunc} = await import(origin)
							} catch {
								console.error(`ERROR finding or using function config() at ${origin}`, error)
							}

							obj = {...obj, ...configFunc()};
						}

						if (ext === "md") {
							try {
								const template_obj = yaml_front.loadFront(await Bun.file(origin).text());
							} catch {
								console.error(`ERROR parsing YAML front matter at ${origin}`, error);
							}

							template_obj.contents = marked.parse(template_obj.__content);
							delete template_obj.__content;
							obj = {...obj, ...template_obj};
						}

						if (ext === "json") {
							try {
								const data_string = await Bun.file(obj.path).text();
							} catch {
								console.error(`Error getting text from ${obj.path}.`, error)
							}

							try {
								const data_obj = JSON.parse(data_string);
							} catch {
								console.error(`Error parsing JSON from ${obj.path}`, error)
							}

							obj.data = data_obj;
						}

						files.push(obj);
					}

					if (stats.isDirectory()) {
						await read(path.join(dir, entry_path));
					} else {
						await createFileObj(entry);
					}
				})
			);
		}

		await read(dir);

		return {settings, files};
	}

	function setData({settings, files} = {}) {
		let data = {};

		files.forEach(file => {
			if (file.data) {
				const data_key = file.name.split('.')[0];
				
				data[data_key] = file.data;
			}
		})

		return {settings, files, data}
	}

	function setCollections({settings, files, data} = {}) {
		let collections = {};

		// COLLECTION FROM FILES
		files
		.filter(file => file.collections)
		.map(file => {
			function pushToCollections(tag) {
				if (!collections.hasOwnProperty(tag)) { 
					collections[tag] = [];
					collections[tag].push(file);
				} else {
					collections[tag].push(file);
				}
			}

			function collectionFromArray(arr) {
				arr.forEach(tag => {
					try {
						pushToCollections(tag);
					} catch {
						console.error(`ERROR adding file to ${tag} collection:`, error);
					}
				});
			}

			Array.isArray(file.collections) ? collectionFromArray(file.collections)
			: typeof file.collections === 'string' ? pushToCollections(file.collections)
			: console.error(`"collections:" needs to be a "String" or an "Array"`)
		});

		// COLLECTION FROM SETTINGS
		if (settings.collect) {
			if (Array.isArray(settings.collect)) {
				settings.collect.map(collection => {
					function runAction(set) {
						// Results to Files
						function paginate(set) {
							let paginated_files;

							Object.entries(collections).map(([key, value]) => {
								if (key === set.name) {
									paginated_files = collections[key];
								}
							});

							let modified_files = paginated_files.map(file => {
								const slug = decipherSlug(file, set.slug);
								file.path = path.join(`${set.path}/${slug}`);
								file.state = !file.state ? set.state : file.state;
								file.layout = !file.layout ? set.layout : file.layout;
								return file;
							})

							if (set.size) {
								// DEFAULTS
								let iterateWith;
								let startAt;

								set.iterateWith ? iterateWith = set.iterateWith : iterateWith = 'number';
								set.startAt ? startAt = set.startAt : startAt = '';

								function chunkArray(arr, size) {
									return arr.length > size ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
									: [arr];
								}

								if (set.sort) {
									modified_files = modified_files.map(file => {
										if (set.sort.by === "date" || !set.sort.by) {
											if (set.sort.format === "mmddyyyy" || !set.sort.format) {
												const dateParts = file.date.split(/-|\//); // - OR /
												
												const month = parseInt(dateParts[0], 10) - 1;
												const day = parseInt(dateParts[1], 10);
												const year = parseInt(dateParts[2], 10);
												file.date = new Date(year, month, day);
											}
										}
										
										return file;
									})

									if (set.sort.order === "newest" || !set.sort.order) {
										modified_files = modified_files.toSorted((a, b) => b.date.getTime() - a.date.getTime());
									}

									if (set.sort.order === "oldest") {
										modified_files = modified_files.toSorted((a, b) => a.date.getTime() - b.date.getTime());
									}
								}

								const chunked_data = chunkArray(modified_files, set.size);

								const new_pages = chunked_data.map(arr => {
									const position = chunked_data.indexOf(arr);
									const dirPath = set.path;

									// Get page path
									let pagePath;
									position === 0 ? pagePath = `${dirPath}` : pagePath = `${dirPath}/${position}`;

									// create hrefs
									let n = chunked_data.length - 1;
									
									const hrefs = [];
									
									function iterate(n){
										if (n !== 0) {
											hrefs.push(`${dirPath}/${n}`);
											n = n-1;
											iterate(n);
										} else {
											hrefs.push(`${dirPath}`);
											return
										}
									}
									
									iterate(n);
									
									const sortedHrefs = hrefs.sort();

									const lastItem = n;
									let params = {}
									if (position !== 0 && position !== lastItem) {
										params = {
											next: `${dirPath}/${position + 1}`,
											previous: `${dirPath}/${position - 1}`,
											first: `${dirPath}`,
											last: `${dirPath}/${lastItem}`,
										}
									} else if (position === 0) {
										params = {
											next: `${dirPath}/${position + 1}`,
											previous: undefined,
											first: undefined,
											last: `${dirPath}/${lastItem}`,
										}
									} else if (position === lastItem) {
										params = {
											next: undefined,
											previous: `${position === 1 ? `${dirPath}` : `/${position - 1}`}`,
											first: `${dirPath}`,
											last: undefined,
										}
									}

									const new_page = {
										name: pagePath,
										path: pagePath,
										type: 'page',
										state: set.state,
										layout: set.layout,
										meta: set.meta,
										data: arr,
										hrefs: sortedHrefs,
										href: params
									}

									return new_page;
								});

								return new_pages;
							} else {
								return modified_files
							}
						}

						// Results to collections
						function organize(set) {
						}

						// Use files colllection as base
						function remedyFiles(array1, array2) {

							const new_objs = [];

							const updated_files = array1.map(obj1 => {
								const matching_obj = array2.find(obj2 => obj1.name === obj2.name);

								if (matching_obj) {
									new_objs.push(matching_obj);
								} else {
									new_objs.push(obj1)
								}
							});

							array2.map(obj2 => {
								const matching_obj = new_objs.find(obj3 => obj3.name === obj2.name);

								if (matching_obj) {
									return
								} else {
									new_objs.push(obj2)
								}
							})

							return new_objs;
						}

						set.action === "paginate" ? files = remedyFiles(files, paginate(set))
						: set.action === "organize" ? organize(set)
						: console.error(`There is no function for "${set.action}". You can create one and pass it through in your settings with "use". Default actions offered by Gondola are: [paginate, organize(coming soon)]`);
					}

					function runActions(obj) {
						const list = obj.actions;
						list.map(set => {
							set.name = obj.name;
							runAction(set);
						})
					}

					collection.action ? runAction(collection)
					: collection.actions ? runActions(collection)
					: console.error(`Your collection "${collection.name}" needs at least one action attached to it.`)
				})
			} else if (typeof settings.collect === 'string') {
				console.error(`ERROR: "collect:" should be an array []:` error);
			}
		}

		return {settings, files, data, collections}
	}

	function setTemplates({settings, files, data, collections} = {}) {
		return Promise.all(files.map(async obj => {
				if (obj.ext === "js") {
					try {
						const {default: defaultFunc} = await import(obj.origin);
					} catch {
						console.error(`ERROR importing default function at ${obj.origin}:`, error);
					}

					obj.contents = defaultFunc(data, collections);
					obj.type ? obj.type = obj.type : obj.type = 'page';
				}


				if (obj.ext === "md") {
					try {
						const template_obj = yaml_front.loadFront(await Bun.file(obj.origin).text());
					} catch {
						console.error(`ERROR parsing YAML front matter:`, error);
					}

					try {
						template_obj.contents = marked.parse(template_obj.__content);
					} catch {
						console.error(`ERROR parsing Markdown:`, error);
					}

					delete template_obj.__content;
					obj = {...obj, ...template_obj};
					obj.type ? obj.type = obj.type : obj.type = 'page';
				}

				return obj;
			})
		).then(files => {
			return {settings, files, data, collections}
		})
	}

	function setLayouts({settings, files, data, collections} = {}) {
		return Promise.all(files.map(async obj => {
				if (obj.layout) {
					const full_path = path.resolve(dir, obj.layout)

					try {
						const {default: defaultFunc} = await import(full_path);
					} catch {
						console.error(`ERROR importing default function at ${full_path}:`, error);
					}

					obj.contents = defaultFunc(data, collections, obj)
				}

				return obj;
			})
		).then(files => {
			return {settings, files, data, collections}
		});
	}

	// TOOLS
	function setSyndication(settings, config, feed) {

		// LOOK FOR TYPE: RSS, Atom, JSONfeed
		let template;

		if (config.template) {
			console.log('SYNDICATION: Using your template...')
		} else {
			template = `
				<?xml version="1.0" encoding="utf-8"?>
				<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xml:base="${config.link}" xmlns:atom="http://www.w3.org/2005/Atom">
				  <channel>
				    <title>${config.title}</title>
				    <link>${config.link}</link>
				    <atom:link href="${config.link}" rel="self" type="application/rss+xml" />
				    <description>${config.description}</description>
				    <language>${config.language || "en"}</language>
				    ${
				    feed
					    .toSorted((a, b) => b.date.getTime() - a.date.getTime())
					    .map(obj => {
					    	const title = obj.title;
					    	const date = new Date(obj.date).toUTCString()
					    	const link = path.join(`${dir}${obj.path}`);
					    	return `
					    		<item>
							      <title>${title}</title>
							      <link>${link}</link>
							      <description>${obj.description}</description>
							      <pubDate>${date}</pubDate>
							      <guid>${link}</guid>
							    </item>
					    	`;
					    })
					    .join('')
					}
				  </channel>
				</rss>
			`;
		}

		template = template
		    .split('\n')           // Split by newline
		    .map(line => line.trim()) // Trim each line
		    .filter(line => line)  // Remove empty lines
		    .join('\n');           // Join the lines back together

		const destination = `${settings.output}/feed.xml`;
		const dest_dir = path.parse(destination).dir;
		fs.mkdirSync(dest_dir, {recursive: true})
		fs.writeFileSync(destination, template)

		console.log(`WROTE: ${settings.output}/feed.xml`);
	}

	function setPWA(settings, config) {
		/*
			1. Set manifest file from config || look for manifest.json/.webmanifest file
			2. Look for startup files from config
			3. Look for icons from config && if only one icon generate multiples and inject in assets folder
			4. Look for fetch strategy: what to do with new pages accessed
			5. Look for update strategy: what to do when the app has been updated
			6. Look for install strategy: If install using button, generate a function that can be attached to any button or link for use in the UI
			7. Look for extensions: notification boolean...
			8. Look for custom file that handles pwa functionality
		*/
		console.log(`PWA | fetch: ${config.sw.fetch}, update: ${config.sw.update}`)
	}

	function pass(settings) {
		const output = settings.output;
		settings.pass.forEach(item => {
			fs.cpSync(path.join(dir, item), path.join(output, item), {recursive: true})
			console.log(`PASSED: ${item}`)
		})
	}

	function use(tree, settings) {
		settings.use.forEach(plugin => {
			if (plugin.name === "syndication") {
				const feed = tree.collections[plugin.feed];
				setSyndication(settings, plugin, feed);
			}

			if (plugin.name === "pwa") {
				setPWA(settings, plugin);
			}
		});
	}

	// BUILD
	async function gen() {
		const start = new Date().getTime();
		const settings = Object.freeze(await getSettings());
		const output = settings.output;

		// CHECK OUTPUT FOLDER
		fs.existsSync(output) === false ? fs.mkdirSync(output) :
		!settings.clean ? fs.rmSync(output, { recursive: true, force: true }) :
		settings.clean === false ? console.log(`Building into current ${output}`) : console.log('building')

		// TREE
		const tree = await setLayouts(await setTemplates(await setCollections(setData(await getFiles(settings, dir)))));

		// PLUGINS
		if (settings.use) {
			try {
				use(tree, settings);
			} catch {
				console.error(`ERROR using tool:`, error);
			}
		}

		// FILES
		const files = tree.files;

		// OUTPUT
		files.forEach(file => {
			if (file.type === 'page') {
				if (file.state === 'publish') {
					const destination_path = file.path === '' ? file.path :
										file.path.charAt(0) !== '/' ? `/${file.path}`
										: file.path

					const destination = `${output}${destination_path}/index.html`;
					const dest_dir = path.parse(destination).dir;
					fs.mkdirSync(dest_dir, {recursive: true})
					fs.writeFileSync(destination, file.contents)
					console.log("WROTE:", destination);
				} else if (file.state === 'draft') {
					console.log(`DRAFT: ${file.name}`)
				} else if (!file.state) {
					console.log(`UNDEFINED STATE: ${file.name}`)
				}
			}
		});

		// PASS
		if (settings.pass) {
			try {
				pass(settings);
			} catch {
				console.error(`ERROR passing over files and/or directories in settings:`, error);
			}
		}

		// END
		const end = new Date().getTime();
		const total_time = (end-start)/1000;
		console.log(`Built in ${total_time} seconds`);
	}

	// SERVE
	async function serve(port) {
	    const settings = Object.freeze(await getSettings());
	    const publicDir = settings.output;

	    // Array to hold connected WebSocket clients
	    let wsClients = [];

	    // Function to handle WebSocket connections
	    function handleWebSocket(socket) {
	        wsClients.push(socket);
	        socket.addEventListener('close', () => {
	            wsClients = wsClients.filter(client => client !== socket);
	        });
	    }

	    // Function to reload the browser when files change
	    function reloadBrowser() {
	        wsClients.forEach(client => {
	            if (client.readyState === WebSocket.OPEN) {
	                client.send('reload');
	            }
	        });
	    }

	    // Function to handle incoming HTTP requests and serve static files
	    async function handleRequest(req) {
	        try {
	            const url = req.url === '/' ? '/index.html' : req.url;
	            const filePath = `${publicDir}${url}`;
	            const file = await Bun.file(filePath);

	            if (filePath.endsWith('.html')) {
	                let content = await file.text();

	                // Script to be injected
	                const script = `
	                    <script>
	                        (function() {
	                            const ws = new WebSocket('ws://localhost:${port}');
	                            ws.onmessage = function(event) {
	                                if (event.data === 'reload') {
	                                    window.location.reload();
	                                }
	                            };
	                        })();
	                    </script>
	                `;

	                // Inject the script just before the closing </body> tag
	                content = content.replace('</body>', `${script}</body>`);

	                return new Response(content, {
	                    headers: { 'Content-Type': 'text/html' }
	                });
	            }

	            return file;
	        } catch (error) {
	            console.error(`Error serving ${req.url}:`, error);
	            return new Response('File not found', { status: 404 });
	        }
	    }

	    // Start the server with both HTTP and WebSocket support
	    bunServe({
	        fetch: handleRequest,
	        port: port,
	        upgrade: (req, socket) => {
	            if (req.headers.get('Upgrade') === 'websocket') {
	                handleWebSocket(socket);
	            } else {
	                socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
	            }
	        }
	    });

	    console.log(`Server running on http://localhost:${port}`);

	    // Watch for file changes in the public directory
	    watch(publicDir, { recursive: true }, (eventType, filename) => {
	        console.log(`File changed: ${filename}`);
	        reloadBrowser();
	    });
	}


	return {
		gen: gen,
		serve: serve
	}
}