// NODE
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// BUN
import { serve as bunServe } from 'bun';

// EXTERNAL
import MarkdownIt from 'markdown-it';
import * as yamlFront from "yaml-front-matter";

export function Gondola(dir) {
	/** Generates a URL-friendly slug based on specified parameters in a line. **/
	function decipherSlug(data, line) {
		const slugParams = line.split('--');
		const slug = slugParams.map(param => {
			if (typeof data[param] === 'string') {
				try {
					return data[param]
						.normalize('NFD') // Normalize to decompose combined graphemes
						.replace(/[\u0300-\u036f]/g, '') // Remove diacritics
						.replace(/[^\w\- ]+/g, '') // Remove non-word chars except hyphens and spaces
						.trim() // Remove leading and trailing spaces
						.replace(/\s+/g, '-') // Replace spaces with hyphens
						.replace(/-+/g, '-') // Replace multiple hyphens with a single one
						.toLowerCase(); // Convert to lowercase
				} catch (error) {
					console.error(`Error: Could not use ${param} at ${line}.`);
				}
			} else {
				console.error(`Error: ${data[param]} is not a 'string' at ${line}.`);
			}
			return '';
		}).join('-');

		return slug;
	}

	/* Parses dates using a designated format */
	function parseDate(dateString, format) {
		let dateParts, year, month, day;

		try {
			if (format === 'EPOCH') {
				return new Date(parseInt(dateString, 10) * 1000);
			} else if (format === 'MONTH DAY, YEAR') {
				dateParts = dateString.split(' ');
				month = new Date(dateParts[0] + " 1, 2020").getMonth();
				day = parseInt(dateParts[1].replace(',', ''), 10);
				year = parseInt(dateParts[2], 10);
			} else {
				dateParts = dateString.split(/-|\//);

				if (dateParts.length === 3) {
					if (format === 'MMDDYYYY') {
						month = parseInt(dateParts[0], 10) - 1;
						day = parseInt(dateParts[1], 10);
						year = parseInt(dateParts[2], 10);
					} else if (format === 'DDMMYYYY') {
						day = parseInt(dateParts[0], 10);
						month = parseInt(dateParts[1], 10) - 1;
						year = parseInt(dateParts[2], 10);
					} else if (format === 'YYYYMMDD') {
						year = parseInt(dateParts[0], 10);
						month = parseInt(dateParts[1], 10) - 1;
						day = parseInt(dateParts[2], 10);
					} else {
						throw new Error(`Gondola effectively parsed your Date: ${dateString}, but it DOES NOT match any of the supported formats. Your format is ${format}.`);
					}	
				} else if (dateParts.length === 1) {
					if (format === 'MMDDYYYY') {
						month = parseInt(dateString.substring(0, 2), 10) - 1;
						day = parseInt(dateString.substring(2, 4), 10);
						year = parseInt(dateString.substring(4, 8), 10);
					} else if (format === 'DDMMYYYY') {
						day = parseInt(dateString.substring(0, 2), 10);
						month = parseInt(dateString.substring(2, 4), 10) - 1;
						year = parseInt(dateString.substring(4, 8), 10);
					} else if (format === 'YYYYMMDD') {
						year = parseInt(dateString.substring(0, 4), 10);
						month = parseInt(dateString.substring(4, 6), 10) - 1;
						day = parseInt(dateString.substring(6, 8), 10);
					} else {
						throw new Error(`Gondola effectively parsed your Date: ${dateString}, but it DOES NOT match any of the supported formats. Your format is ${format} and it DOES NOT contain delimiters.`);
					}
				}
			}
		} catch(error) {
			console.error(`${error}. Please check Gondola's documentation to ensure your format designation is written correctly. Gondola checks dates for "-" or "/". If it doesn't find these it assumes the string is written without any delimiters.`)
		}

		return new Date(year, month, day);
	}

	function processJS(obj) {
		try {
			const {default: defaultFunc} = await import(obj.origin);
			obj.contents = defaultFunc({data: data, collections: collections, context: obj});
			return obj;
		} catch (error) {
			console.error(`ERROR importing default function at ${obj.origin}.`);
		}
	}

	function processMD(obj) {
		let templateObj;

		try {
			templateObj = yamlFront.loadFront(await Bun.file(obj.origin).text());
		} catch (error) {
			console.error(`ERROR parsing YAML front matter at ${obj.origin}:`, error);
		}

		if (templateObj) {
			try {
				const md = new MarkdownIt({
					html: true
				});

				// Render Markdown to HTML
				let rawHtml = md.render(templateObj.__content);

				// Sanitize the HTML
				templateObj.contents = rawHtml;
				delete templateObj.__content;
				obj = {...obj, ...templateObj};

				return obj;
			} catch (error) {
				console.error(`ERROR parsing Markdown at ${obj.origin}:`, error);
			}
		}
	}

	// NOT READY
	function processJSON(obj) {
		if (ext === "json") {
		    let dataString;
		    let dataObj;

		    try {
		        dataString = await Bun.file(obj.path).text();
		    } catch (error) {
		        console.error(`ERROR getting text from ${obj.path}.`, error);
		    }

		    if (dataString) {
		        try {
		            dataObj = JSON.parse(dataString);

		            // Process Markdown content in JSON data recursively
		            const md = new MarkdownIt({ html: true });
		            function processMarkdownContent(obj) {
		                if (Array.isArray(obj)) {
		                    // If it's an array, process each item
		                    obj.forEach(item => processMarkdownContent(item));
		                } else if (obj && typeof obj === 'object') {
		                    // If it's an object, process each key
		                    for (let key in obj) {
		                        if (obj.hasOwnProperty(key)) {

		                            // Check for keys ending with '_md'
		                            if (key.endsWith('_md')) {
		                                obj[key] = md.render(obj[key]);
		                            }

		                            // Check for 'g_format' property set to 'markdown'
		                            if (obj[key] && typeof obj[key] === 'object' && obj[key].g_format === 'markdown' || obj[key].g_format === 'md') {
		                                obj[key].body = md.render(obj[key].body);
		                            }

		                            // Recursive call for nested objects and arrays
		                            processMarkdownContent(obj[key]);
		                        }
		                    }
		                }
		            }

		            processMarkdownContent(dataObj);
		        } catch (error) {
		            console.error(`ERROR parsing JSON from ${obj.path}`, error);
		        }
		    }

		    if (dataObj && dataObj.collections) {
		        obj = {...obj, ...dataObj};
		    } else {
		        obj.data = dataObj;
		    }
		}
	}

	async function getSettings() {
		try {
			let defaultSettings = {
				starter: '',
				output: '_site',
				appOutput: '_app',
				includes: '_includes',
				drafts: '_drafts',
				data: '_data',
				collections: '_collections',
				configFile: 'config',
				starterFile: 'index',
				ignore: [
					'.git',
					'.gitignore',
					'node_modules',
					'package.json',
					'bun.lockb',
					'gondola.config.js',
					'package-lock.json'
				],
				pass: [],
				template: 'contents'
			};

			let userSettings;
			let joinedSettings = {};

			if (fs.existsSync(path.resolve(dir, 'gondola.config.js'))) {
				const {default: defaultFunc} = await import(path.resolve(dir, 'gondola.config.js'))
				userSettings = defaultFunc();
			} else {
				userSettings = {};
			}

			Object.entries(userSettings).forEach(([key, value]) => {
				if (Array.isArray(value)) {
					const defaultArray = Object.entries(defaultSettings);
					const match = defaultArray.find(([default_key, default_value]) => {
						return default_key === key
					});

					if (match !== undefined) {
						joinedSettings[key] = [...match[1], ...value]
					} else {
						joinedSettings[key] = value
					}
				} else {
					joinedSettings[key] = value
				}
			});

			return {...defaultSettings, ...joinedSettings};
		} catch (error) {
			console.error(`ERROR: Could not get "settings" from "gondola.config.js". Please make sure the following is addressed:
				- The function within gondola.config.js is the 'default' function.
				- The function returns an object {} with the key/value you'd like to change.
			`, error);
		}
	}

	async function getFileReps(settings, baseDir) {
		let files = [];

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

			return obj;
		}

		async function read(currentDir) {
			const file_entries = await fs.promises.readdir(currentDir);

			const filtered_entries = file_entries
				.filter(entry => !settings.ignore.includes(entry))
				.filter(entry => !settings.pass.includes(entry))
				.filter(entry => entry !== settings.output)
				.filter(entry => entry !== settings.appOutput)
				.filter(entry => !entry.startsWith('.'))
				.map(async entry => {
					const entryPath = path.join(currentDir, entry);

					if (fs.existsSync(entryPath)) {
						const stats = await fs.promises.stat(entryPath);

						if (stats.isDirectory()) {
							await read(entryPath);
						} else {
							files.push(await createFileObj(entryPath, baseDir));
						}
					}
				});

			await Promise.all(filtered_entries);
		}

		await read(baseDir);

		return {settings, files};
	}

	async function getGlobalData({settings, files} = {}) {
	    let data = {};
	    let unprocessedFiles = [];

	    for (const file of files) {
	        // Assuming file.path is the full path and we're checking if it's within the data directory
	        if (file.path.startsWith(settings.data)) {
	            try {
	                const filePath = file.path;
	                const fileName = path.basename(file.path, path.extname(file.path)); // Remove extension

	                // Read and parse JSON file
	                const fileContents = await fs.promises.readFile(filePath, 'utf8');
	                const fileData = JSON.parse(fileContents);

	                // Use the filename as the key for the data
	                data[fileName] = fileData;
	            } catch (error) {
	                console.error(`ERROR: Could not get data from ${file.path}. Make sure your data is valid JSON.`, error);
	                // Add to unprocessedFiles if it fails to process
	                unprocessedFiles.push(file);
	            }
	        } else {
	            // If the file is not within the data directory, it's considered unprocessed at this stage
	            unprocessedFiles.push(file);
	        }
	    }

	    // Return only the files that haven't been processed as data files
	    return {settings, files: unprocessedFiles, data};
	}

	function getCollections({settings, files, data} = {}) {
	   function getCollectionGroups(settings, files) {
		   const collections = {};

		    // Filter files that are in the collections directory
		    files.forEach(file => {
		        if (file.path.startsWith(`${settings.collections}/`)) {
		            // Extract the collection name from the path
		            const pathParts = file.path.split('/');
		            const collectionName = pathParts[pathParts.indexOf(settings.collections) + 1];

		            if (!collections[collectionName]) {
		                collections[collectionName] = [];
		            }

		            collections[collectionName].push(file);
		        }
		    });

		    return collections;
	   }

	   function processCollections(settings, collections) {
		    settings.collect.forEach(operation => {
		        const collectionFiles = collections[operation.collection];

		        if (collectionFiles) {
		        	function getCollectionFiles(collections, set) {
						let collection_files;

						Object.entries(collections).map(([key, value]) => {
							if (key === set.collection) {
								collection_files = collections[key];
							}
						});

						return collection_files.map(file => {
							const slug = decipherSlug(file, set.slug);
							file.path = path.join(`${set.path}/${slug}`);
							file.state = !file.state ? set.state : file.state;
							file.layout = !file.layout ? set.layout : file.layout;

							return file;
						});
					}

					// ACTIONS
					function paginate(set) {
						// Get files from collections
						let modifiedFiles = getCollectionFiles(collections, set);

						// SORT
						if (set.sort) {
							modifiedFiles = sortCollection(modifiedFiles, set);
						}

						modifiedFiles = modifiedFiles.map(file => {
							file.type = "page";
							return file;
						});

						return modifiedFiles;
					}

					function paginateGroups(set) {
						// Get files from collections
						let modifiedFiles = getCollectionFiles(collections, set);

						// SORT
						if (set.sort) {
							modifiedFiles = sortCollection(modifiedFiles, set);
						}

						// SIZE
						if (!set.size) {
							console.error(`ERROR: You need to set a SIZE for ${set.collection}.`);
							return;
						}

						// DEFAULTS
						// let iterateWith;
						// let startAt;

						// set.iterateWith ? iterateWith = set.iterateWith : iterateWith = 'number';
						// set.startAt ? startAt = set.startAt : startAt = '';

						function chunkArray(arr, size) {
							return arr.length > size ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
							: [arr];
						}

						const chunkedData = chunkArray(modifiedFiles, set.size);

						const newPages = chunkedData.map(arr => {
							const position = chunkedData.indexOf(arr);
							const n = chunkedData.length - 1;
							let pagePath;
							let hrefsArray = [];
							let params = {};
							let pageData = {};

							function iterate(n){
								if (n !== 0) {
									hrefsArray.push(`${dirPath}/${n}`);
									n = n-1;
									iterate(n);
								} else {
									hrefsArray.push(`${dirPath}`);
									return
								}
							}

							position === 0 ? pagePath = `${dirPath}` : pagePath = `${dirPath}/${position}`;

							iterate(n);

							hrefsArray.sort();

							if (position !== 0 && position !== n) {
								params = {
									next: `${dirPath}/${position + 1}`,
									previous: `${dirPath}/${position - 1}`,
									first: `${dirPath}`,
									last: `${dirPath}/${n}`,
								}

								pageData = {
									items: arr,
									next: chunkedData[position + 1],
									previous: chunkedData[position - 1],
									first: chunkedData[0],
									last: chunkedData[n],
								}
							} else if (position === 0) {
								params = {
									next: `${dirPath}/${position + 1}`,
									previous: undefined,
									first: undefined,
									last: `${dirPath}/${n}`,
								}

								pageData = {
									items: arr,
									next: chunkedData[position + 1],
									previous: undefined,
									first: undefined,
									last: chunkedData[n],
								}
							} else if (position === n) {
								params = {
									next: undefined,
									previous: `${position === 1 ? `${dirPath}` : `/${position - 1}`}`,
									first: `${dirPath}`,
									last: undefined,
								}

								pageData = {
									items: arr,
									next: undefined,
									previous: chunkedData[position - 1],
									first: chunkedData[0],
									last: undefined,
								}
							}

							const newPage = {
								name: pagePath,
								path: pagePath,
								type: 'page',
								state: set.state,
								layout: set.layout,
								meta: set.meta,
								hrefs: hrefsArray,
								href: params,
								pages: chunkedData,
								page: pageData
							}

							return newPage;
						});

						modifiedFiles = newPages;

						return modifiedFiles;
					}
		        }
		    });
		}

		const groups = getCollectionGroups(settings, files);
		processCollections(settings, groups);
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

			// combines config to obj
			if (ext === "js") {
				try {
		            const importedModule = await import(obj.origin);

		            // Check if 'config' function exists in the imported module
		            if (typeof importedModule.config === 'function') {
		                obj = { ...obj, ...importedModule.config() };
		            }
		        } catch (error) {
		            console.error(`ERROR processing JS file at ${obj.origin}`, error);
		        }
			}

			if (ext === "md") {
				let templateObj;

				try {
					templateObj = yamlFront.loadFront(await Bun.file(obj.origin).text());
				} catch (error) {
					console.error(`ERROR parsing YAML front matter at ${obj.origin}:`, error);
				}

				if (templateObj) {
					try {
						const md = new MarkdownIt({
							html: true
						});

						// Render Markdown to HTMLtemplateObj
						let rawHtml = md.render(templateObj.__content);

						// Sanitize the HTML
						templateObj.contents = rawHtml;
						delete templateObj.__content;
						obj = {...obj, ...templateObj};
					} catch (error) {
						console.error(`ERROR parsing Markdown at ${obj.origin}:`, error);
					}
				}
			}

			// Considered data and adds a file.data obj
			if (ext === "json") {
			    let dataString;
			    let dataObj;

			    try {
			        dataString = await Bun.file(obj.path).text();
			    } catch (error) {
			        console.error(`ERROR getting text from ${obj.path}.`, error);
			    }

			    if (dataString) {
			        try {
			            dataObj = JSON.parse(dataString);

			            // Process Markdown content in JSON data recursively
			            const md = new MarkdownIt({ html: true });
			            function processMarkdownContent(obj) {
			                if (Array.isArray(obj)) {
			                    // If it's an array, process each item
			                    obj.forEach(item => processMarkdownContent(item));
			                } else if (obj && typeof obj === 'object') {
			                    // If it's an object, process each key
			                    for (let key in obj) {
			                        if (obj.hasOwnProperty(key)) {

			                            // Check for keys ending with '_md'
			                            if (key.endsWith('_md')) {
			                                obj[key] = md.render(obj[key]);
			                            }

			                            // Check for 'g_format' property set to 'markdown'
			                            if (obj[key] && typeof obj[key] === 'object' && obj[key].g_format === 'markdown' || obj[key].g_format === 'md') {
			                                obj[key].body = md.render(obj[key].body);
			                            }

			                            // Recursive call for nested objects and arrays
			                            processMarkdownContent(obj[key]);
			                        }
			                    }
			                }
			            }

			            processMarkdownContent(dataObj);
			        } catch (error) {
			            console.error(`ERROR parsing JSON from ${obj.path}`, error);
			        }
			    }

			    if (dataObj && dataObj.collections) {
			        obj = {...obj, ...dataObj};
			    } else {
			        obj.data = dataObj;
			    }
			}

			files.push(obj);
		}

		async function read(currentDir) {
			const file_entries = await fs.promises.readdir(currentDir);

			const filtered_entries = file_entries
				.filter(entry => !settings.ignore.includes(entry))
				.filter(entry => !settings.pass.includes(entry))
				.filter(entry => entry !== settings.output)
				.filter(entry => entry !== settings.appOutput)
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

	// /** Creates a global data object from file data using the name of the file as the key within the object. **/
	// function setData({settings, files} = {}) {
	// 	let data = {};

	// 	files.forEach(file => {
	// 		try {
	// 			if (file.data) {
	// 				const dataKey = file.name.split('.')[0];

	// 				data[dataKey] = file.data;
	// 			}
	// 		} catch (error) {
	// 			console.error(`ERROR: Could not get data from ${file.path}. Make sure your data is valid JSON. Gondola uses the filename as the key within the global "data" object.`);
	// 		}
	// 	});

	// 	return {settings, files, data}
	// }

	/** Creates a collection from an action or set of actions and houses them within a global collections object or generates files. **/
	function setCollections({settings, files, data} = {}) {
		let collections = {};

		// COLLECTION MODS
		function sortCollection(setFiles, set) {
			let sortedFiles;

			if (set.sort.by === "date" || !set.sort.by) {
				sortedFiles = setFiles.sort((a, b) => {
				    const dateA = parseDate(a.date, set.sort.format.toUpperCase());
				    const dateB = parseDate(b.date, set.sort.format.toUpperCase());

				    if (set.sort.order === "newest" || !set.sort.order) {
						return dateB - dateA;
					}

					if (set.sort.order === "oldest") {
						return dateA - dateB;
					}
				});
			}

			if (set.sort.by === "title") {
			    sortedFiles = setFiles.sort((a, b) => a.title.localeCompare(b.title));
			}	

			return sortedFiles;
		}

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
			: console.error(`ERROR: "collections:" needs to be a "String" or an "Array"`)
		});

		// COLLECTION FROM SETTINGS
		if (settings.collect) {
			if (Array.isArray(settings.collect)) {
				settings.collect.map(collection => {
					function runAction(set, action) {
						const dirPath = set.path;

						function getCollectionFiles(collections, set) {
							let collection_files;

							Object.entries(collections).map(([key, value]) => {
								if (key === set.collection) {
									collection_files = collections[key];
								}
							});

							return collection_files.map(file => {
								const slug = decipherSlug(file, set.slug);
								file.path = path.join(`${set.path}/${slug}`);
								file.state = !file.state ? set.state : file.state;
								file.layout = !file.layout ? set.layout : file.layout;

								return file;
							});
						}

						// ACTIONS
						function paginate(set) {
							// Get files from collections
							let modifiedFiles = getCollectionFiles(collections, set);

							// SORT
							if (set.sort) {
								modifiedFiles = sortCollection(modifiedFiles, set);
							}

							modifiedFiles = modifiedFiles.map(file => {
								file.type = "page";
								return file;
							});

							return modifiedFiles;
						}

						function paginateGroups(set) {
							// Get files from collections
							let modifiedFiles = getCollectionFiles(collections, set);

							// SORT
							if (set.sort) {
								modifiedFiles = sortCollection(modifiedFiles, set);
							}

							// SIZE
							if (!set.size) {
								console.error(`ERROR: You need to set a SIZE for ${set.collection}.`);
								return;
							}

							// DEFAULTS
							// let iterateWith;
							// let startAt;

							// set.iterateWith ? iterateWith = set.iterateWith : iterateWith = 'number';
							// set.startAt ? startAt = set.startAt : startAt = '';

							function chunkArray(arr, size) {
								return arr.length > size ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
								: [arr];
							}

							const chunkedData = chunkArray(modifiedFiles, set.size);

							const newPages = chunkedData.map(arr => {
								const position = chunkedData.indexOf(arr);
								const n = chunkedData.length - 1;
								let pagePath;
								let hrefsArray = [];
								let params = {};
								let pageData = {};

								function iterate(n){
									if (n !== 0) {
										hrefsArray.push(`${dirPath}/${n}`);
										n = n-1;
										iterate(n);
									} else {
										hrefsArray.push(`${dirPath}`);
										return
									}
								}

								position === 0 ? pagePath = `${dirPath}` : pagePath = `${dirPath}/${position}`;

								iterate(n);

								hrefsArray.sort();

								if (position !== 0 && position !== n) {
									params = {
										next: `${dirPath}/${position + 1}`,
										previous: `${dirPath}/${position - 1}`,
										first: `${dirPath}`,
										last: `${dirPath}/${n}`,
									}

									pageData = {
										items: arr,
										next: chunkedData[position + 1],
										previous: chunkedData[position - 1],
										first: chunkedData[0],
										last: chunkedData[n],
									}
								} else if (position === 0) {
									params = {
										next: `${dirPath}/${position + 1}`,
										previous: undefined,
										first: undefined,
										last: `${dirPath}/${n}`,
									}

									pageData = {
										items: arr,
										next: chunkedData[position + 1],
										previous: undefined,
										first: undefined,
										last: chunkedData[n],
									}
								} else if (position === n) {
									params = {
										next: undefined,
										previous: `${position === 1 ? `${dirPath}` : `/${position - 1}`}`,
										first: `${dirPath}`,
										last: undefined,
									}

									pageData = {
										items: arr,
										next: undefined,
										previous: chunkedData[position - 1],
										first: chunkedData[0],
										last: undefined,
									}
								}

								const newPage = {
									name: pagePath,
									path: pagePath,
									type: 'page',
									state: set.state,
									layout: set.layout,
									meta: set.meta,
									hrefs: hrefsArray,
									href: params,
									pages: chunkedData,
									page: pageData
								}

								return newPage;
							});

							modifiedFiles = newPages;

							return modifiedFiles;
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

						action === "paginate" ? files = remedyFiles(files, paginate(set))
						: action === "paginateGroups" ? files = remedyFiles(files, paginateGroups(set))
						: console.error(`Error: There is no function for "${action}". You can create one and pass it through in your settings with "custom: {action: yourAction()}. Default actions offered by Gondola are: [paginate, paginateGroups]`);
					}

					function runActions(collection) {
						collection.actions.forEach(action => {
							runAction(collection, action);
						});
					}

					Array.isArray(collection.actions) && collection.actions.length === 1 ? runAction(collection, collection.actions[0])
					: Array.isArray(collection.actions) && collection.actions.length > 1 ? runActions(collection)
					: console.error(`Error: Your collection "${collection.collection}" must be an Array and contain at least one action.`)
				})
			} else if (typeof settings.collect === 'string') {
				console.error(`Error: "collect" in gondola.js must be an Array.`);
			}
		}

		return {settings, files, data, collections}
	}

	// /** Creates a contents key/value pair within the file object that houses the template for that file. **/
	// function setTemplates({settings, files, data, collections} = {}) {
	// 	return Promise.all(files.map(async obj => {
	// 			if (obj.ext === "js" && obj.type !== "layout") {
	// 				try {
	// 					const {default: defaultFunc} = await import(obj.origin);
	// 					obj.contents = defaultFunc({data: data, collections: collections, context: obj});
	// 				} catch (error) {
	// 					console.error(`ERROR importing default function at ${obj.origin}.`);
	// 				}
	// 			}


	// 			if (obj.ext === "md") {
	// 				let templateObj;

	// 				try {
	// 					templateObj = yamlFront.loadFront(await Bun.file(obj.origin).text());
	// 				} catch (error) {
	// 					console.error(`ERROR parsing YAML front matter at ${obj.origin}:`, error);
	// 				}

	// 				if (templateObj) {
	// 					try {
	// 						const md = new MarkdownIt({
	// 							html: true
	// 						});

	// 						// Render Markdown to HTML
	// 						let rawHtml = md.render(templateObj.__content);

	// 						// Sanitize the HTML
	// 						templateObj.contents = rawHtml;
	// 						delete templateObj.__content;
	// 						obj = {...obj, ...templateObj};
	// 					} catch (error) {
	// 						console.error(`ERROR parsing Markdown at ${obj.origin}:`, error);
	// 					}
	// 				}
	// 			}

	// 			return obj;
	// 		})
	// 	).then(files => {
	// 		return {settings, files, data, collections}
	// 	})
	// }

	/** Creates an html layout which typically houses the contents of specified file object. **/
	async function setLayouts({settings, files, data, collections} = {}) {
	    async function applyLayout(file, files, data, collections) {
	        if (!file.layout) {
	            return file.contents; // No further layout to apply
	        }

	        const layoutPath = path.resolve(dir, file.layout);

	        try {
	            const layoutFunc = (await import(layoutPath)).default;
	            if (typeof layoutFunc !== 'function') {
	                throw new Error(`ERROR: Layout at ${layoutPath} does not export a default function`);
	            }

	            const updatedFileContents = await layoutFunc({data: data, collections: collections, context: file});
	            file.contents = updatedFileContents;

	            const nextLayoutFile = files.find(f => f.path === file.layout);

	  			if (nextLayoutFile.layout) {
	  				file.layout = nextLayoutFile.layout;
	  				return await applyLayout(file, files, data, collections); // Recursion
	  			} else {
	  				return file.contents;
	  			}
	        } catch (error) {
	            console.error(`ERROR applying layout from ${layoutPath}.`);
	            return file;
	        }
	    }

	    const updatedFiles = await Promise.all(
	        files.map(async file => {
	            if (file.type === 'page') {
	                file.contents = await applyLayout(file, files, data, collections);
	            }
	            return file;
	        })
	    );

	    return {settings, files: updatedFiles, data, collections};
	}

	/** Creates a RSS feed based on a set collection within the settings object. **/
	function genSyndication(settings, tree, config) {
		const feed = tree.collections[config.feed];
		const feedType = config.feedType;

		function assignTemplate(type, config, feed) {
			let template;

			if (type === 'RSS') {
				template = `
					<?xml version="1.0" encoding="utf-8"?>
					<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xml:base="${config.link}" xmlns:atom="http://www.w3.org/2005/Atom">
					  <channel>
					    <title>${config.title}</title>
					    <link>${config.link}</link>
					    <description>${config.description}</description>
					    <language>${config.language || "en"}</language>
					    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
					    <atom:link href="${config.link}" rel="self" type="application/rss+xml" />
					    ${feed
						    .toSorted((a, b) => parseDate(b.date, config.dateFormat) - parseDate(a.date, config.dateFormat))
						    .map(item => {
						    	const title = item.title;
						    	const date = parseDate(item.date, config.dateFormat).toUTCString()
						    	const itemLink = path.join(`${config.link}/${item.path}`);
						    	return `
						    		<item>
								      <title>${title}</title>
								      <link>${itemLink}</link>
								      <description>${item.description}</description>
								      <pubDate>${date}</pubDate>
								      <guid>${itemLink}</guid>
								    </item>
						    	`;
						    })
						    .join('')
						}
					  </channel>
					</rss>
				`;
			} else if (type === 'ATOM') {
			  template = `
			    <?xml version="1.0" encoding="utf-8"?>
			    <feed xmlns="http://www.w3.org/2005/Atom">
			      <title>${config.title}</title>
			      <link href="${config.link}" rel="self"/>
			      <updated>${new Date().toISOString()}</updated>
			      <id>${config.link}</id>
			      ${feed
			        .toSorted((a, b) => parseDate(b.date, config.dateFormat) - parseDate(a.date, config.dateFormat))
			        .map(item => {
			          const title = item.title;
			          const date = parseDate(item.date, config.dateFormat).toISOString();
			          const itemLink = path.join(`${config.link}/${item.path}`);
			          return `
			            <entry>
			              <title>${title}</title>
			              <link href="${itemLink}"/>
			              <id>${itemLink}</id>
			              <updated>${date}</updated>
			              <summary>${item.description}</summary>
			            </entry>
			          `;
			        })
			        .join('')
			      }
			    </feed>
			  `;
			} else if (type === 'JSONFEED') {
				const items = feed
			    .toSorted((a, b) => parseDate(b.date, config.dateFormat) - parseDate(a.date, config.dateFormat))
			    .map(item => {
			      const title = item.title;
			      const date = parseDate(item.date, config.dateFormat).toISOString();
			      const itemLink = path.join(`${config.link}/${item.path}`);
			      return {
			        id: itemLink,
			        url: itemLink,
			        title: title,
			        content_text: item.description,
			        date_published: date
			      };
			    });

			  template = JSON.stringify({
			    version: "https://jsonfeed.org/version/1",
			    title: config.title,
			    home_page_url: config.link,
			    feed_url: `${config.link}/feed.json`,
			    items: items
			  }, null, 2); // Pretty print the JSON
			}

			template = template
			    .split('\n')           // Split by newline
			    .map(line => line.trim()) // Trim each line
			    .filter(line => line)  // Remove empty lines
			    .join('\n');           // Join the lines back together

			return {type, template};
		}

		function createPage({type, template} = {}) {
			let destination;
			let output;

			if (settings.use && settings.use.find(plugin => plugin.name === 'pwa')) {
				output = settings.appOutput;
			} else {
				output = settings.output;
			}

			type === 'RSS' ? destination = `${output}/feed.xml`
			: type === 'ATOM' ? destination = `${output}/feed.atom`
			: type === 'JSONFEED' ? destination = `${output}/feed.json`
			: console.error(`Could not create path for ${type}`)
		
			const destDir = path.parse(destination).dir;
			fs.mkdirSync(destDir, {recursive: true})
			fs.writeFileSync(destination, template)

			console.log(`WROTE: ${destination}`);
		}

		if (Array.isArray(feedType)) {
			feedType.forEach(type => createPage(assignTemplate(type.toUpperCase(), config, feed)))
		} else {
			createPage(assignTemplate(feedType.toUpperCase(), config, feed))
		}
	}

	/** Creates the various parts of a simple PWA based on the settings object. **/
	async function genPWA(settings, tree, config) {

		async function generateManifest(config) {
			let manifestData;

			if (typeof config.manifest === 'string') {
				// Read manifest data from file
				const filePath = config.manifest;
				manifestData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
			} else if (typeof config.manifest === 'object') {
				let defaultManifest = {
					startUrl: "/",
					display: "standalone",
					themeColor: "#ffffff",
					backgroundColor: "#000",
				}

				let userManifest = config.manifest;

				if (userManifest.icons) {
					if (typeof userManifest.icons === 'object') {
						const src = userManifest.icons.src;
						const output = userManifest.icons.output;
						const index = src.lastIndexOf('.');
						const ext = index > 0 ? src.substring(index + 1) : '';

						let sharp;

						const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];

						async function resizeAndSaveImage(imagePath, outputDir) {
							const fullOutput = `${settings.appOutput}/${outputDir}`;

						  // Dynamically import sharp the first time the function is called
						  if (!sharp) {
						    sharp = (await import('sharp')).default;
						  }

							if (!fs.existsSync(fullOutput)) {
								fs.mkdirSync(fullOutput, { recursive: true });
							}

						  for (const size of sizes) {
						    const outputFile = `${fullOutput}/icon-${size}x${size}.${ext}`;

						    try {
						      await sharp(imagePath)
						        .resize(size, size) // Resize the image to each size
						        .toFile(outputFile); // Save the resized image

						      console.log(`WROTE APP ICON: ${outputFile}`);
						    } catch (error) {
						      console.error(`Error resizing image to ${size}x${size}:`, error);
						    }
						  }
						}

						// Example usage
						await resizeAndSaveImage(src, output);

						const iconsArray = sizes.map(size => ({
				            src: `${output}/icon-${size}x${size}.${ext}`, // Assuming `output` is the directory relative to the web root
				            sizes: `${size}x${size}`,
				            type: `image/${ext === 'svg' ? 'svg+xml' : ext}` // Handle SVG MIME type correctly
				        }));

				        // Add or update the icons array in the userManifest object
				        userManifest.icons = iconsArray;

				        // Combine the default manifest and user manifest again in case icons were added/updated
				        manifestData = { ...defaultManifest, ...userManifest };
					} else if (Array.isArray(userManifest.icons)) {
						return;
					}
				} else {
					throw new Error('You need to include an array of icons to your manifest OR an object with an image source and output path so Gondola can create the array of icons for you.')
				}

				manifestData = {...defaultManifest, ...userManifest}
			} else {
				throw new Error('Invalid manifest configuration');
			}

			// Generate manifest.json
			const destination = `${settings.appOutput}/manifest.json`;
		    const destDir = path.parse(destination).dir;
		    await fs.promises.mkdir(destDir, {recursive: true});
		    await fs.promises.writeFile(destination, JSON.stringify(manifestData, null, 2));
			console.log(`WROTE APP MANIFEST: ${settings.appOutput}/manifest.json`);
		}

		function generateFetchStrategy(config) {
		    let strategyCode = '';

		    switch (config.fetchStrategy) {
		        case 'cacheFirst':
		            strategyCode = `
		                self.addEventListener('fetch', function(event) {
		                    event.respondWith(
		                        caches.match(event.request)
		                            .then(function(response) {
		                                return response || fetch(event.request);
		                            })
		                    );
		                });
		            `;
		            break;
		        case 'networkFirst':
		            strategyCode = `
		                self.addEventListener('fetch', function(event) {
		                    event.respondWith(
		                        fetch(event.request).catch(function() {
		                            return caches.match(event.request);
		                        })
		                    );
		                });
		            `;
		            break;
		        case 'cacheOnly':
		            strategyCode = `
		                self.addEventListener('fetch', function(event) {
		                    event.respondWith(caches.match(event.request));
		                });
		            `;
		            break;
		        case 'networkOnly':
		            strategyCode = `
		                self.addEventListener('fetch', function(event) {
		                    event.respondWith(fetch(event.request));
		                });
		            `;
		            break;
		        case 'staleWhileRevalidate':
		            strategyCode = `
		                self.addEventListener('fetch', function(event) {
		                    event.respondWith(
		                        caches.match(event.request)
		                            .then(function(response) {
		                                const fetchPromise = fetch(event.request).then(function(networkResponse) {
		                                    caches.open('dynamic-cache').then(function(cache) {
		                                        cache.put(event.request, networkResponse.clone());
		                                        return networkResponse;
		                                    });
		                                });
		                                return response || fetchPromise;
		                            })
		                    );
		                });
		            `;
		            break;
		        default:
		            throw new Error('Invalid fetch strategy');
		    }

		    return strategyCode;
		}

		function generateUpdateStrategy(config) {
			let strategyCode = '';

			switch (config.updateStrategy) {
			    case 'autoUpdate':
			        strategyCode = `
			            self.addEventListener('fetch', function(event) {
			                event.respondWith(
			                    caches.open('dynamic-cache').then(function(cache) {
			                        return fetch(event.request).then(function(response) {
			                            cache.put(event.request, response.clone());
			                            return response;
			                        });
			                    })
			                );
			            });
			        `;
			        break;
			    case 'onPrompt':
			        strategyCode = `
			            self.addEventListener('message', function(event) {
			                if (event.data.action === 'skipWaiting') {
			                    self.skipWaiting();
			                }
			            });

			            // In your web app, you'll need to prompt the user and then send this message
			            // navigator.serviceWorker.controller.postMessage({action: 'skipWaiting'});
			        `;
			        break;
			    case 'onRestart':
			        strategyCode = `
			            self.addEventListener('activate', function(event) {
			                event.waitUntil(
			                    caches.keys().then(function(cacheNames) {
			                        return Promise.all(
			                            cacheNames.map(function(cacheName) {
			                                // Clear out old cache
			                            })
			                        );
			                    })
			                );
			            });
			        `;
			        break;
			    default:
			        throw new Error('Invalid update strategy');
			}

			return strategyCode;
		}

		function generateExtensions(config) {}

		function writeToServiceWorker(fetchStrategyCode, updateStrategyCode) {
		    // Combine the strategy codes
		    const combinedContent = fetchStrategyCode + updateStrategyCode;

		    // Define the destination file path for the service worker
		    const destination = `${settings.appOutput}/${config.serviceWorker.output || 'sw.js'}`;

		    // Ensure the directory exists before writing the file
		    const destDir = path.parse(destination).dir;
		    if (!fs.existsSync(destDir)) {
		        fs.mkdirSync(destDir, { recursive: true });
		    }

		    // Write the combined content directly to the service worker file
		    fs.writeFileSync(destination, combinedContent);

		    console.log(`WROTE SERVICE WORKER: ${destination}`);
		}

		const fetchStrategyCode = generateFetchStrategy(config.serviceWorker);
		const updateStrategyCode = generateUpdateStrategy(config.serviceWorker);
		const extensionsCode = generateExtensions(config.serviceWorker);

		await generateManifest(config)
		writeToServiceWorker(fetchStrategyCode, updateStrategyCode);
	}

	/** Creates a sitemap file based on the output directory **/
	function genSitemap(settings, fileTree, plugin) {
		let outputDir;

		if (settings.use && settings.use.find(plugin => plugin.name === 'pwa')) {
			outputDir = settings.appOutput;
		} else {
			outputDir = settings.output;
		}

		const baseUrl = plugin.baseUrl;

	    function getFilesRecursively(directory) {
	        const entries = fs.readdirSync(directory, { withFileTypes: true });
	        let files = [];

	        for (let entry of entries) {
	            const entryPath = path.join(directory, entry.name);
	            if (entry.isDirectory()) {
	                files = [...files, ...getFilesRecursively(entryPath)];
	            } else {
	                // Exclude non-HTML files
	                if (path.extname(entry.name) === '.html') {
	                    const stats = fs.statSync(entryPath);
	                    files.push({
	                        path: entryPath,
	                        modified: stats.mtime
	                    });
	                }
	            }
	        }

	        return files;
	    }

	    function determinePriority(filePath) {
	        // Count the depth based on the number of slashes in the relative path
	        const depth = (filePath.match(new RegExp("/", "g")) || []).length;
	        
	        // Assign priority based on depth
	        switch (depth) {
	            case 0: return '1.0'; // Root level (e.g., home page)
	            case 1: return '0.8'; // First level
	            case 2: return '0.6'; // Second level
	            default: return '0.5'; // Deeper levels or default
	        }
	    }

	    const files = getFilesRecursively(outputDir);

	    const urls = files.map(file => {
	        let relativePath = path.relative(outputDir, file.path);
	        let lastMod;
	        fileTree.forEach(obj => {
	        	if (`${outputDir}/${relativePath}` === obj.path) {
	        		if (obj.modified) {
	        			lastMod = obj.modified.toISOString();
	        		}
	        	}
	        });

	        relativePath = relativePath.replace(/index.html$/, ''); // Remove index.html
	        relativePath = relativePath.replace(/\.html$/, ''); // Remove .html
	        let urlPath = `${baseUrl}/${relativePath}`;
			if (urlPath[urlPath.length - 1] !== '/') {
				urlPath = urlPath += '/'; // Append '/' if it's not there
			}
	       //const trimmedPath = urlPath.replace(/\/$/, "");
	       //const lastMod = file.modified.toISOString();
	        const priority = determinePriority(relativePath);
	        return `  <url><loc>${urlPath}</loc>${lastMod !== undefined ? `<lastmod>${lastMod}</lastmod>`: ''}<priority>${priority}</priority></url>`;
	    });

	    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n${urls.join('\n')}\n</urlset>`;
	    const destination = path.join(outputDir, 'sitemap.xml');
	    fs.writeFileSync(destination, sitemapContent);
	    console.log("WROTE SITEMAP:", destination);
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
	async function use(settings, tree, plugin) {
		if (plugin.name === "syndication") {
			try {
				genSyndication(settings, tree, plugin);
			} catch (error) {
				console.error(`Error: Could not generate syndication for ${plugin.feed}.`);
			}
		}

		if (plugin.name === "pwa") {
			try {
				await genPWA(settings, tree, plugin);
			} catch (error) {
				console.error(`Error: Could not generate PWA.`)
			}
		}

		if (plugin.name === "sitemap") {
			try {
				genSitemap(settings, tree, plugin);
			} catch (error) {
				console.error(`Error: Could not generate sitemap.`);
			}
		}
	}

	/** Creates an "output" of directories and files based on the result of a chain of functions. **/
	// async function gen() {
	// 	const start = Date.now();
	// 	const settings = Object.freeze(await getSettings());
	// 	let output;

	// 	if (settings.use && settings.use.find(plugin => plugin.name === 'pwa')) {
	// 		output = settings.appOutput;
	// 	} else {
	// 		output = settings.output;
	// 	}

	// 	// CHECK OUTPUT FOLDER
	// 	fs.existsSync(output) === false ? fs.mkdirSync(output) :
	// 	!settings.clean ? fs.rmSync(output, { recursive: true, force: true }) :
	// 	settings.clean === false ? console.log(`GONDOLA: Building into current ${output}`) : console.log('building')

	// 	// CHAIN
	// 	const chain = await setLayouts(await setTemplates(await setCollections(setData(await getFiles(settings, dir)))));

	// 	// PLUGINS (PREBUILD)
	// 	if (settings.use) {
	// 		for (const plugin of settings.use) {
	// 			if (plugin.name === "pwa" || plugin.name === "syndication" || plugin.timeline == "preBuild") {
	// 				try {
	// 					await use(settings, chain, plugin);
	// 				} catch (error) {
	// 					console.error(`ERROR using plugins "preBuild". Check "gondola.js config file"`);
	// 				}
	// 			}
	// 		};
	// 	}

	// 	// FILES
	// 	const files = chain.files;

	// 	let fileStats = [];

	// 	// OUTPUT
	// 	files.forEach(file => {
	// 		if (file.type === 'page') {
	// 			if (file.state === 'publish') {
	// 				let destinationPath;

	// 				if (file.path === '' || file.path === 'home.js' || file.path === 'index.js' || file.path === 'index.md' || file.path === 'home.md' || file.path === 'index.json') {
	// 					destinationPath = '';
	// 				} else {
	// 					// Parse the file path to get the directory and name without extension
	// 					const parsedPath = path.parse(file.path);
	// 					const directoryPath = parsedPath.dir;
	// 					const fileNameWithoutExt = parsedPath.name;

	// 					// Construct the destination path
	// 					destinationPath = path.join(directoryPath, fileNameWithoutExt);

	// 					// Ensure destination path starts with a slash
	// 					destinationPath = destinationPath.charAt(0) !== '/' ? `/${destinationPath}` : destinationPath;
	// 				}

	// 				let destination;

	// 				if (!settings.coolUrls) {
	// 					destination = `${output}${destinationPath}/index.html`;
	// 				} else if (settings.coolUrls === false) {
	// 					destination = `${output}${destinationPath}.html`;
	// 				}

	// 				// TEMPORARY
	// 				fileStats.push({path: destination, modified: file.modified});
					
	// 				// Create directory and write file
	// 				const destDir = path.parse(destination).dir;
	// 				fs.mkdirSync(destDir, {recursive: true});
	// 				fs.writeFileSync(destination, file.contents);
	// 				console.log("WROTE:", destination);
	// 			} else if (file.state === 'draft') {
	// 				console.log(`DRAFT: ${file.name}`);
	// 			} else if (!file.state) {
	// 				console.log(`UNDEFINED STATE: ${file.name}`);
	// 			}
	// 		}
	// 	});

	// 	// PLUGINS (POSTBUILD)
	// 	if (settings.use) {
	// 		for (const plugin of settings.use) {
	// 			if (plugin.name === "sitemap" || plugin.timeline == "postBuild") {
	// 				try {
	// 					await use(settings, fileStats, plugin);
	// 				} catch (error) {
	// 					console.error(`ERROR using plugins "postBuild". Check "gondola.js config file"`);
	// 				}
	// 			}
	// 		};
	// 	}

	// 	// PASS
	// 	if (settings.pass) {
	// 		try {
	// 			pass(settings);
	// 		} catch (error) {
	// 			console.error(`ERROR passing over files and/or directories in settings:`, error);
	// 		}
	// 	}

	// 	// END
	// 	const end = Date.now();
	// 	const total_time = (end - start) / 1000;
	// 	console.log(`Built in ${total_time} seconds`);
	// }

	async function gen() {
		const start = Date.now();
		const settings = Object.freeze(await getSettings());
		let output;

		if (settings.use && settings.use.find(plugin => plugin.name === 'pwa')) {
			output = settings.appOutput;
		} else {
			output = settings.output;
		}

		// CHECK OUTPUT FOLDER
		fs.existsSync(output) === false ? fs.mkdirSync(output) :
		!settings.clean ? fs.rmSync(output, { recursive: true, force: true }) :
		settings.clean === false ? console.log(`GONDOLA: Building into current ${output}`) : console.log('building')

		// CHAIN
		const chain = getCollections(await getGlobalData(await getFileReps(settings, dir)));

		// PLUGINS (PREBUILD)
		// if (settings.use) {
		// 	for (const plugin of settings.use) {
		// 		if (plugin.name === "pwa" || plugin.name === "syndication" || plugin.timeline == "preBuild") {
		// 			try {
		// 				await use(settings, chain, plugin);
		// 			} catch (error) {
		// 				console.error(`ERROR using plugins "preBuild". Check "gondola.js config file"`);
		// 			}
		// 		}
		// 	};
		// }

		// FILES
		//const files = chain.files;

		// let fileStats = [];

		// // OUTPUT
		// files.forEach(file => {
		// 	if (file.type === 'page') {
		// 		if (file.state === 'publish') {
		// 			let destinationPath;

		// 			if (file.path === '' || file.path === 'home.js' || file.path === 'index.js' || file.path === 'index.md' || file.path === 'home.md' || file.path === 'index.json') {
		// 				destinationPath = '';
		// 			} else {
		// 				// Parse the file path to get the directory and name without extension
		// 				const parsedPath = path.parse(file.path);
		// 				const directoryPath = parsedPath.dir;
		// 				const fileNameWithoutExt = parsedPath.name;

		// 				// Construct the destination path
		// 				destinationPath = path.join(directoryPath, fileNameWithoutExt);

		// 				// Ensure destination path starts with a slash
		// 				destinationPath = destinationPath.charAt(0) !== '/' ? `/${destinationPath}` : destinationPath;
		// 			}

		// 			let destination;

		// 			if (!settings.coolUrls) {
		// 				destination = `${output}${destinationPath}/index.html`;
		// 			} else if (settings.coolUrls === false) {
		// 				destination = `${output}${destinationPath}.html`;
		// 			}

		// 			// TEMPORARY
		// 			fileStats.push({path: destination, modified: file.modified});
					
		// 			// Create directory and write file
		// 			const destDir = path.parse(destination).dir;
		// 			fs.mkdirSync(destDir, {recursive: true});
		// 			fs.writeFileSync(destination, file.contents);
		// 			console.log("WROTE:", destination);
		// 		} else if (file.state === 'draft') {
		// 			console.log(`DRAFT: ${file.name}`);
		// 		} else if (!file.state) {
		// 			console.log(`UNDEFINED STATE: ${file.name}`);
		// 		}
		// 	}
		// });

		// PLUGINS (POSTBUILD)
		// if (settings.use) {
		// 	for (const plugin of settings.use) {
		// 		if (plugin.name === "sitemap" || plugin.timeline == "postBuild") {
		// 			try {
		// 				await use(settings, fileStats, plugin);
		// 			} catch (error) {
		// 				console.error(`ERROR using plugins "postBuild". Check "gondola.js config file"`);
		// 			}
		// 		}
		// 	};
		// }

		// PASS
		// if (settings.pass) {
		// 	try {
		// 		pass(settings);
		// 	} catch (error) {
		// 		console.error(`ERROR passing over files and/or directories in settings:`, error);
		// 	}
		// }

		// END
		const end = Date.now();
		const total_time = (end - start) / 1000;
		console.log(`Built in ${total_time} seconds`);
	}

	/** Creates an http server. **/
	async function serve(port) {
	    const settings = await getSettings();
    	const outputDir = path.join(dir, settings.output);

		function getContentType(filePath) {
			const extension = path.extname(filePath);
			switch (extension) {
				case '.html': return 'text/html; charset=utf-8';
				case '.css': return 'text/css; charset=utf-8';
				case '.js': return 'application/javascript; charset=utf-8';
				case '.json': return 'application/json; charset=utf-8';
				case '.png': return 'image/png';
				case '.jpg': return 'image/jpeg';
				case '.jpeg': return 'image/jpeg';
				case '.gif': return 'image/gif';
				case '.svg': return 'image/svg+xml';
				default: return 'text/plain';
			}
		}

		bunServe({
			fetch(req) {
				try {
					let urlPath = new URL(req.url).pathname;
					let filePath = path.join(outputDir, urlPath);

					if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
						filePath = path.join(filePath, 'index.html');
					}

					if (fs.existsSync(filePath)) {
						const contentType = getContentType(filePath);

						return new Response(fs.readFileSync(filePath), {
							headers: { 'Content-Type': contentType }
						});
					}

					return new Response('File not found', { status: 404 });
				} catch (error) {
					console.error(`SERVER: Error serving ${req.url}:`, error);
					return new Response('Internal Server Error', { status: 500 });
				}
			},
			port: port
		});
		const url = `http://localhost:${port}`;

		console.log(`SERVER: Running on ${url}`);

		const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
		exec(`${start} ${url}`, (err) => {
			if (err) {
				console.warn(`SERVER: Failed to automatically open browser. Server is running. Manually open ${url}.`);
			}
		});
	}

	return {
		gen: gen,
		serve: serve
	}
}