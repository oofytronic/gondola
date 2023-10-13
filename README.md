# Gondola
Gondola is a speedy static site generator and content engine for various web content structures. It can be used to create websites and Progressive Web Apps as well as web related content (books, documentation, podcasts, music, etc).

## Overview
- Gondola is written in Javascript.
- Gondola uses Javascript functions and template literals as the templating system for webpages, components, and whatever else you can think of. It's all Javascript.
- Gondola converts Markdown files into webpages.
- Gondola reads JSON files and stores the contents as data.
- Each file in your project is read and converted into an object and then passed through a series of functions based on your requirements. The outcome is a new "\_site" folder ready for you to publish to the World Wide Web.

## Installation
```
bun install  git@github.com:oofytronic/gondola --save-dev
```

## Documentation
Coming Soon!

## Quick Start
coming soon...

```js
export function config() {
	const meta = {
		title : "Home | Made to Fly Technologies",
		des : "We create technologies for the web that allow users to achieve digital freedom."
	}

	return {
		type: 'page',
		state: 'publish',
		path: '/',
		meta: meta
	}
}

export default function home(data, collections) {
	return `
		<p>This is the Homepage for the Gondola Engine</p>
	`;
}
```

All js templates are structured this way. Export a 'config' function that tells Gondola what to do with the template. Export a 'default' function that represents your template. Gondola will create a contents key with your template.

4. Run bun ornithopter. By default a '\_site' folder will be created with an index.html file containing your template as html. You can upload the '\_site' to your hosting platform.