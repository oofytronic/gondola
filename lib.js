// NODE
import * as fs from 'fs';
import * as path from 'path';

// BUN
import { serve as bunServe } from 'bun';

// EXTERNAL
import {marked} from 'marked';
import * as yaml_front from "yaml-front-matter";


export function Gondola(dir) {
	/**
	* Generates a URL-friendly slug based on specified parameters in a line.
	*
	* @param {Object} data - The data object containing key-value pairs that the function uses to construct the slug.
	* @param {string} line - A string representing the parameters used to create the slug, separated by '--'. Each parameter should correspond to a key in the data object.
	* @returns {string} A URL-friendly slug created from the specified parameters. If a parameter is not a string or an error occurs, it will return an empty string for that part.
	**/
	function decipherSlug(data, line) {
		const slugParams = line.split('--');
		const slug = slugParams.map(param => {
			if (typeof data[param] === 'string') {
				try {
					return data[param]
						.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
						.replace(/[^a-zA-Z0-9- ]/g, '') // Remove special characters except hyphens and spaces
						.replace(/\s+/g, '-') // Replace spaces with hyphens
						.replace(/-+/g, '-') // Replace multiple hyphens with a single one
						.trim()
						.toLowerCase();
				} catch (error) {
					console.error(`ERROR: Could not use ${param} at ${line}`, error);
				}
			} else {
				console.error(`ERROR: ${data[param]} is not a 'string' at ${line}`);
			}
			return '';
		}).join('-');

		return slug;
	}

	/** Combines the default settings with user settings to present the overall preferences as an object that is referenced when making generation decisions. **/
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
				pass: [],
				data: '_data'
			};

			let user_settings;
			let joined_settings = {};

			if (fs.existsSync(path.resolve(dir, 'gondola.js'))) {
				const {default: defaultFunc} = await import(path.resolve(dir, 'gondola.js'))
				user_settings = defaultFunc();
			} else {
				user_settings = {};
			}

			Object.entries(user_settings).forEach(([key, value]) => {
				if (Array.isArray(value)) {
					const default_array = Object.entries(default_settings);
					const match = default_array.find(([default_key, default_value]) => {
						return default_key === key
					});

					if (match !== undefined) {
						joined_settings[key] = [...match[1], ...value]
					} else {
						joined_settings[key] = value
					}
				} else {
					joined_settings[key] = value
				}
			});

			return {...default_settings, ...joined_settings};
		} catch (error) {
			console.error(`ERROR: Could not get "settings" from "gondola.js". Please make sure the following is addressed:
				- The function within gondola.js is the 'default' function.
				- The function returns an object {} with starter, output, includes, drafts, ignore, pass, or data keys in order to overwrite the default settings.
			`, error);
		}
	}

	/** Reads the project "starter" directory and creates file_objects from file information. **/
	async function getFiles(settings, baseDir) {
		const files = [];

		async function createFileObj(filePath, baseDir) {
			const stats = await fs.promises.stat(filePath);
			const ext = path.extname(filePath).slice(1);
			const relativePath = path.relative(baseDir, filePath);
			const absolutePath = path.resolve(process.cwd(), relativePath);

			let obj = {
				name: path.basename(filePath),
				path: relativePath,
				origin: absolutePath,
				ext: ext,
				size: stats.size,
				created: stats.birthtime,
				modified: stats.mtime,
				mode: stats.mode
			};


			if (ext === "js") {
				try {
					const {config: configFunc} = await import(obj.origin)
					obj = {...obj, ...configFunc()};

				} catch (error) {
					console.error(`ERROR finding or using function config() at ${obj.origin}`, error)
				}
			}

			if (ext === "md") {
				let template_obj;

				try {
					template_obj = yaml_front.loadFront(await Bun.file(obj.origin).text());
				} catch (error) {
					console.error(`ERROR parsing YAML front matter at ${obj.origin}:`, error);
				}

				if (template_obj) {
					try {
						template_obj.contents = marked.parse(template_obj.__content);
						delete template_obj.__content;
						obj = {...obj, ...template_obj};
					} catch (error) {
						console.error(`ERROR parsing Markdown at ${obj.origin}:`, error);
					}
				}
			}

			if (ext === "json") {
				let data_string;
				let data_obj;

				try {
					data_string = await Bun.file(obj.path).text();
				} catch (error) {
					console.error(`Error getting text from ${obj.path}.`, error)
				}

				if (data_string) {
					try {
						data_obj = JSON.parse(data_string);
					} catch (error) {
						console.error(`Error parsing JSON from ${obj.path}`, error)
					}
				}

				obj.data = data_obj;
			}

			files.push(obj);
		}

		async function read(currentDir) {
			const file_entries = await fs.promises.readdir(currentDir);

			const filtered_entries = file_entries
				.filter(entry => !settings.ignore.includes(entry))
				.filter(entry => !settings.pass.includes(entry))
				.filter(entry => entry !== settings.includes)
				.filter(entry => entry !== settings.output)
				.filter(entry => !entry.startsWith('.'))
				.map(async entry => {
					const entryPath = path.join(currentDir, entry);

					if (fs.existsSync(entryPath)) {
						const stats = await fs.promises.stat(entryPath);

						if (stats.isDirectory()) {
							await read(entryPath);
						} else {
							await createFileObj(entryPath, baseDir);
						}
					}
				});

			await Promise.all(filtered_entries);
		}

		await read(baseDir);

		return {settings, files};
	}

	/** Creates a global data object from file data using the name of the file as the key within the object. **/
	function setData({settings, files} = {}) {
		let data = {};

		files.forEach(file => {
			try {
				if (file.data) {
					const data_key = file.name.split('.')[0];
					
					data[data_key] = file.data;
				}
			} catch (error) {
				console.error(`ERROR: Could not pull data from ${file.path}. Make sure your data is valid JSON. Gondola uses the filename as the key within the global "data" object.`);	
			}
		});

		return {settings, files, data}
	}

	/** Creates a collection from an action or set of actions and houses them within a global collections object or generates files. **/
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
					} catch (error) {
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
						function organize(set) {}

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
				console.error(`ERROR: settings.collect should be an array:`, error);
			}
		}

		return {settings, files, data, collections}
	}

	/** Creates a contents key/value pair within the file object that houses the template for that file. **/
	function setTemplates({settings, files, data, collections} = {}) {
		return Promise.all(files.map(async obj => {
				if (obj.ext === "js") {
					try {
						const {default: defaultFunc} = await import(obj.origin);
						obj.contents = defaultFunc({data: data, collections: collections});
						obj.type ? obj.type = obj.type : obj.type = 'page';
					} catch (error) {
						console.error(`ERROR importing default function at ${obj.origin}:`, error);
					}
				}


				if (obj.ext === "md") {
					let template_obj;

					try {
						template_obj = yaml_front.loadFront(await Bun.file(obj.origin).text());
					} catch (error) {
						console.error(`ERROR parsing YAML front matter at ${obj.origin}:`, error);
					}

					if (template_obj) {
						try {
							template_obj.contents = marked.parse(template_obj.__content);
							delete template_obj.__content;
							obj = {...obj, ...template_obj};
							obj.type ? obj.type = obj.type : obj.type = 'page';
						} catch (error) {
							console.error(`ERROR parsing Markdown at ${obj.origin}:`, error);
						}
					}
				}

				return obj;
			})
		).then(files => {
			return {settings, files, data, collections}
		})
	}

	/** Creates an html layout which typically houses the contents of specified file object. **/
	function setLayouts({settings, files, data, collections} = {}) {
		return Promise.all(files.map(async obj => {
				if (obj.layout) {
					const full_path = path.resolve(dir, obj.layout)

					try {
						const {default: defaultFunc} = await import(full_path);
						obj.contents = defaultFunc({data: data, collections: collections, obj: obj})
					} catch (error) {
						console.error(`ERROR importing default function at ${full_path}:`, error);
					}
				}

				return obj;
			})
		).then(files => {
			return {settings, files, data, collections}
		});
	}

	// TOOLS
	/** Creates a RSS feed based on a set collection within the settings object. **/
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

	/** Creates the various parts of a simple PWA based on the settings object. **/
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


		// 3
		/* async function optimizeImage(imagePath, sizes, outputDir) {
			// Dynamically import sharp
			const sharp = await import('sharp');

			// Ensure output directory exists
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			// Process each size and create resized images
			return Promise.all(sizes.map(async size => {
				const outputFilePath = path.join(outputDir, `icon-${size}.png`);

				try {
					await sharp(imagePath)
						.resize(size, size) // Resize maintaining aspect ratio
						.toFormat('png')    // Convert to PNG
						.toFile(outputFilePath);

					console.log(`Generated icon: ${outputFilePath}`);
					return outputFilePath;
				} catch (error) {
					console.error(`Error generating icon of size ${size}:`, error);
					return null;
				}
			}));
		}

		// Example Usage
		async function generatePWAIcons() {
			const sourceImagePath = 'path/to/source/image.jpg';
			const iconSizes = [128, 256, 512]; // Example sizes
			const outputDir = 'path/to/output/icons';

			try {
				const icons = await optimizeImage(sourceImagePath, iconSizes, outputDir);
				console.log('Generated Icons:', icons);
			} catch (error) {
				console.error('Error generating PWA icons:', error);
			}
		}


		// PWA BUILD
		generatePWAIcons();
		*/


		console.log(`PWA | fetch: ${config.sw.fetch}, update: ${config.sw.update}`)
	}

	/** Passes through directories and files specified in the settings object. **/
	function pass(settings) {
		const output = settings.output;
		settings.pass.forEach(item => {
			fs.cpSync(path.join(dir, item), path.join(output, item), {recursive: true})
			console.log(`PASSED: ${item}`)
		})
	}

	/** Creates a plugin chain for plugins to be used at build time. **/
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

	// GENERATE
	/** Creates an "output" of directories and files based on the result of a chain of functions. **/
	async function gen() {
		const start = Date.now();
		const settings = Object.freeze(await getSettings());
		const output = settings.output;

		// CHECK OUTPUT FOLDER
		fs.existsSync(output) === false ? fs.mkdirSync(output) :
		!settings.clean ? fs.rmSync(output, { recursive: true, force: true }) :
		settings.clean === false ? console.log(`Building into current ${output}`) : console.log('building')

		// CHAIN
		const chain = await setLayouts(await setTemplates(await setCollections(setData(await getFiles(settings, dir)))));

		// PLUGINS
		if (settings.use) {
			try {
				use(chain, settings);
			} catch (error) {
				console.error(`ERROR using tool:`, error);
			}
		}

		// FILES
		const files = chain.files;

		// OUTPUT
		files.forEach(file => {
			if (file.type === 'page') {
				if (file.state === 'publish') {
					let destinationPath;

					if (file.path === '' || file.path === 'home.js' || file.path === 'index.js' || file.path === 'index.md' || file.path === 'home.md') {
						// Handle the case when file.path is an empty string
						destinationPath = '';
					} else {
						// Parse the file path to get the directory and name without extension
						const parsedPath = path.parse(file.path);
						const directoryPath = parsedPath.dir;
						const fileNameWithoutExt = parsedPath.name;

						// Construct the destination path
						destinationPath = path.join(directoryPath, fileNameWithoutExt);

						// Ensure destination path starts with a slash
						destinationPath = destinationPath.charAt(0) !== '/' ? `/${destinationPath}` : destinationPath;
					}

					// Add '/index.html' to the path
					const destination = `${output}${destinationPath}/index.html`;

					// Create directory and write file
					const destDir = path.parse(destination).dir;
					fs.mkdirSync(destDir, {recursive: true});
					fs.writeFileSync(destination, file.contents);
					console.log("WROTE:", destination);
				} else if (file.state === 'draft') {
					console.log(`DRAFT: ${file.name}`);
				} else if (!file.state) {
					console.log(`UNDEFINED STATE: ${file.name}`);
				}
			}
		});


		// PASS
		if (settings.pass) {
			try {
				pass(settings);
			} catch (error) {
				console.error(`ERROR passing over files and/or directories in settings:`, error);
			}
		}

		// END
		const end = Date.now();
		const total_time = (end - start) / 1000;
		console.log(`Built in ${total_time} seconds`);
	}

	// SERVE
	/** Creates a live websocket server with hot reload capabilities. **/
	async function serve(port) {
		console.log(port)
	    const settings = Object.freeze(await getSettings());

		const output_dir = path.join(dir, settings.output);

        bunServe({
            fetch(req) {
                const urlPath = new URL(req.url).pathname;
                const filePath = path.join(output_dir, urlPath === '/' ? 'index.html' : urlPath);

                try {
                    if (fs.existsSync(filePath)) {
                        return new Response(fs.readFileSync(filePath), {
                            headers: {
                                'Content-Type': 'text/html' // or other appropriate content type based on file
                            }
                        });
                    }

                    return new Response('File not found', { status: 404 });
                } catch (error) {
                    console.error(`Error serving ${req.url}:`, error);
                    return new Response('Internal Server Error', { status: 500 });
                }
            },
            port: port,
            upgrade(req, socket) {
                if (req.headers.get('Upgrade') === 'websocket') {
                    const ws = socket.accept();
                    ws.addEventListener('message', (event) => {
                        console.log('Received message:', event.data);
                        ws.send('Message received');
                    });
                } else {
                    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
                }
            }
        });

	    // console.log(`WebSocket server running on ws://localhost:${port}`);
	}

	return {
		gen: gen,
		serve: serve
	}
}