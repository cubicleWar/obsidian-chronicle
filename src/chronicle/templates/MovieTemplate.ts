import { ARTWORK_PROPERTIES, ARTWORK_EMBED } from "./ArtworkTemplate.js";
import { templateMetadata } from "./TemplateMetadata.js";

const MOVIE_TEMPLATE_CONTENT =
`---
title: {{ safeYamlString title }}
imdb_id: {{ safeYamlString imdb_id }}
tmdb_id: {{ tmdb_id }}
categories: {{ yaml categories }}
genres: {{ yaml genres }}
director: {{ safeYamlString director }}
cast: {{ yaml cast }}
writers: {{ yaml writers }}
runtime: {{ runtime }}
year: {{ year }}
rating: {{ rating }}
rated: {{ safeYamlString rated }}
released: {{ released }}
languages: {{ yaml languages }}
countries: {{ yaml countries }}
${ARTWORK_PROPERTIES}
box_office: {{ safeYamlString box_office }}
watch_dates: {{ yaml watch_dates }}
${templateMetadata("movie-2026-10-25a")}
---

# {{title}}

${ARTWORK_EMBED}

{{ overview }}
`

export const MOVIE_TEMPLATE = {
	name: "Movie Template",
	content: MOVIE_TEMPLATE_CONTENT
}
