# Gondola JS
Gondola is a simple Static Site Generator and Progressive Web App (PWA) builder focused on a streamlined developer experience. Gondola aims to be an antithesis to "modern" website building where bloated frameworks seize every aspect of the web platform without reason and static site generators try to accomodate every single use case or workflow. Most websites today are over-engineered, heavy and hard to maintain. Gondola aims to help developers have fun creating websites again.

***Gondola is experimental and should not be used in production***

## At a Glance
### JavaScript Templates
Use JavaScript to create templates, manage your configuration, add logic to your templates and whatever else you can think of. Gondola is built with JavaScript as well. Not TypeScript. JavaScript. Sweet, sweet vanilla ice cream. The [Bun](https://bun.sh/docs) runtime provides filesystem and server interactivity.

### Collections
Gondola finds every instance of a collection and puts it into a global *collections* object. Gondola uses a concept called "Collection Actions" to determine what happens to a collection of files or collection of data.

### Layouts
Gondola makes use of layouts and layout nesting for easy management of reusable content.

### Markdown
Gondola handles Markdown files gracefully. Provide Gondola with everything it needs to know with YAML front matter.

### JSON Data
Store JSON data in a *"\_data"* directory and Gondola will add it to a global *data* object accessible to your templates.

### PWA
Gondola helps developers create simple and effective Progressive Web Apps by offering a clear config, an easy checklist and simple defaults for things like service worker strategies and push notifications. Tell Gondola what you want your PWA to do and it will take care of creating the files, service worker strategies, notification workflows and more.


## The Workflow
Gondola reads the directory it is installed into or run in. It turns each file it finds into a *context* and that *context* is made available when writing templates along with a global *data* object and a global *collections* object. You can use `{data, collections, context}` in your JavaScript templates. It will use an optional *gondola.js* configuration file for further instructions on collections, plugins and other processes like omitting specific files and directories from processing.


## Get Started
### Prerequisites
- [Bun](https://bun.sh/docs) (JavaScript Runtime for filesystem interactivity)
- Git (version control)

### Installation
```
bun install @feathermode/gondola --save-dev
```

OR

```
bun install -g @feathermode/gondola --save-dev
```