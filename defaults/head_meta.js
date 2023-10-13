// default metadata file

export function page_meta() {
	const template = `
	<meta charset="UTF-8"/>
	<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
	<meta name="author" content="${meta.siteauthor}"/>
	<meta name="generator" content="${meta.generatorname}"/>
	<meta name="canonical" content="${meta.siteurl}"/>
	<meta property="og:title" content="${meta.title}"/>
	<meta property="og:type" content="website"/>
	<meta property="og:url" content="${meta.siteurl}"/>
	<meta property="og:site_name" content="${meta.sitename}"/>
	<meta property="og:image" content="${meta.siteimage}"/>
	<meta property="og:description" content="${meta.description}"/>
	<title>${meta.title}</title>
	<link rel="icon" type="image/x-icon" href="${meta.favicon}">
	<meta name="description" content="${meta.description}"/>
	${meta_scripts ? meta_scripts.map(script => `<script src="${script}" type="module" defer></script>`).join("") : ""}`;
}