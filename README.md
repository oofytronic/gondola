# Gondola
Gondola is a static site generator, PWA builder and content engine for various web content structures. Use it to create static websites and Progressive Web Apps (PWAs) as well as web related content (books, documentation, podcasts, music, etc)(coming soon).

***Gondola is experimental and should not be used in production***

## Overview
- **Language:** Gondola is written in JavaScript with [Bun](https://bun.sh/docs).
- **Templating:** Gondola uses JavaScript as a templating system. Use any JS within a default function to create your template. 
- **Content Creation:** Gondola converts Markdown files into webpages and looks for Markdown within JSON files as well.
- **Data**: Gondola reads JSON files and stores the contents as data.
- **Collections:** Gondola works with collections of content by finding every instance of a collection, housing it in a global *"collections"* object and running processes based on a concept called "Collection Actions" to determine what happens to a collection of files or data.
- **Layouts**: Gondola makes use of layouts and layout nesting.
- **Apps**: Gondola makes it very easy to create a PWA within the gondola.js file. It encourages PWA creation and will automatically look for the prerequisties for a PWA when generating and if it finds them your build will be stored in an "\_app" directory.
- **Configuration:** Gondola does NOT require configuration to work. However, most developers will need to use the *gondola.js* config file to create desired websites and web apps.
- **Workflow:** Gondola reads your file system starting at the directory it is installed into by default. It turns each file it finds into a *"context"* and that *"context"* is made available when writing templates along with a global *"data"* object and a global *"collections"* object. You can use *{data, collections, context}* in your JavaScript template functions.

## Installation
```
bun install @feathermode/gondola --save-dev
```

## Quick Start
```
bun gondola
```

## Example: JS Template Page
```js
export const config = () => {
	const meta = {
		title : "Home | Nimbus Nectar",
		description : "Nimbus Nectar is a blog devoted to the majesty of airships."
	}

	return {
		type: 'page',
		state: 'publish',
		meta: meta
	}
}

export default ({data}) => {
	const renderAirshipsList = airships => airships.map(airship => `<li>${airship.name}</li>`).join('');

	return `
		<h1>Nimbus Nectar</h1>
		<p>Airships ascend above as airborne architects amaze. Aerostats accelerate amidst azure atmospheres. Aviators arm adventurous aspirations alongside airy actions."</p>
		<h2>List of Airships</h2>
		<ul>
			${renderAirshipsList(data.airships)}
		</ul>
	`;
}
```

In this template:

- A "config" function tells Gondola what to do with the template. You can think of this as the frontmatter for your JavaScript template.
- A "default" function represents your template. Gondola will create a "contents" key with your template.
- Within the "default" function template there is a template literal that pulls in a list of airship information from the global "data" object made available by Gondola. This template literal returns an array of airship names through "map" and uses join('') to join the array items with empty space instead of the default ",".

The wonderful thing about this form of templating is the only limitation is JavaScript. Write any kind of JavaScript you'd like within the confines of the JS file and it will work. The above example shows just one way of structuring your JavaScript template. The only requirement for a template file in Gondola is the existence of a "config" function and a "default" function.

## Example: Markdwon Template Page
```md
---
layout: _includes/layout.js
title: About
---

# About Nimbus Nectar

Nimbus Nectar is a blog and airship resource created by OOF to showcase the history and revival of airships. 


```

In this template: 

- YAML frontmatter delimited with (---) is used to house data relavant to Gondola and templating.
- Markdown is written immediately after and this content is made available in the pages context.contents.

## Documentation
Coming Soon!