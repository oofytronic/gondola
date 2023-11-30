# Gondola
Gondola is a speedy static site generator and content engine for various web content structures. It can be used to create websites and Progressive Web Apps as well as web related content (books, documentation, podcasts, music, etc).

***Gondola is experimental and should not be used in production***

## Overview
- Gondola is written in Javascript.
- Gondola uses Javascript functions and template literals as the templating system for webpages, components, and whatever else you can think of.
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

export default function home({data, collections}) {
	return `
		<p>Airships ascend above, altering aerial adventures amazingly. Atmospheric ambiances allure aficionados, as airborne architectures amaze. Aerostatic airships, aloft amidst azure atmospheres, afford awe-inspiring aesthetics. Aviators admire airships' agility, acknowledging aerodynamic advancements. Altogether, airships' allure adventurous aspirations."</p>
		<ul>
			${data.airships.map(airship => `<li>${airship.name}</li>`).join('')}
		</ul>
	`;
}
```

In this template:

- A "config" function tells Gondola what to do with the template. You can think of this as the frontmatter for your javascript template.
- A "default" function represents your template. Gondola will create a "contents" key with your template.
- Within the "default" function template there is a template literal that pulls in a list of airship information from the global "data" object passed into the function by Gondola. This template literal returns a list of airship names through "map" and joins the items with empty space with join(''). We use join('') because map() returns separates array items with a "," by default and since we want our list to not include those commas we join with empty space instead.