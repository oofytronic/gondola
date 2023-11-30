# Gondola
Gondola is a speedy static site generator and content engine for various web content structures. It can be used to create websites and Progressive Web Apps (PWAs) as well as web related content (books, documentation, podcasts, music, etc).

***Gondola is experimental and should not be used in production***

## Overview
- Gondola is written in JavaScript.
- Gondola uses JavaScript functions and template literals as the templating system for webpages, components, and whatever else you can think of.
- Gondola converts Markdown files into webpages.
- Gondola reads JSON files and stores the contents as data.
- Each file in your project is read and converted into an object and then passed through a series of functions based on your requirements. The outcome is a new "\_site" folder ready for you to publish to the World Wide Web.

## Key Concepts
- **Configuration:** Gondola does NOT require configuration to work, just installation. However, most developers will need to use the gondola.js config file to create their desired websites and web apps.
- Gondola reads your file system starting at the directory it is installed into by default. You can change this with the "starter" setting. It turns each file it finds into a file_obj
- 

## Installation
```
bun install @feathermode/gondola --save-dev
```

## Documentation
Coming Soon!

## Quick Start
```
bun gondola
```

## Example: Template Page
```js
export function config() {
	const meta = {
		title : "Home | Nimbus Nectar",
		description : "Nimbus Nectar is a blog devoted to the beauty of airships."
	}

	return {
		type: 'page',
		state: 'publish',
		meta: meta
	}
}

export default function home({data}) {
	const renderAirshipsList = airships => airships.map(airship => `<li>${airship.name}</li>`).join('');

	return `
		<h1>Nimbus Nectar</h1>
		<p>Airships ascend above, altering aerial adventures amazingly. Atmospheric ambiances allure aficionados, as airborne architectures amaze. Aerostatic airships, aloft amidst azure atmospheres, afford awe-inspiring aesthetics. Aviators admire airships' agility, acknowledging aerodynamic advancements. Altogether, airships' allure adventurous aspirations."</p>
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