import { ARTWORK_PROPERTIES, ARTWORK_EMBED } from "./ArtworkTemplate.js";
import { templateMetadata } from "./TemplateMetadata.js";

const SERIES_TEMPLATE_CONTENT =
`---
title: {{ safeYamlString title }}
imdb_id: {{ safeYamlString imdb_id }}
tmdb_id: {{ tmdb_id }}
categories: {{ yaml categories }}
genres: {{ yaml genres }}
cast: {{ yaml cast }}
rating: {{ rating }}
year: {{ year }}
released: {{ released }}
languages: {{ yaml languages }}
countries: {{ yaml countries }}
seasons: {{ number_of_seasons }}
episodes: {{ number_of_episodes }}
${ARTWORK_PROPERTIES}
networks: {{ yaml networks }}
${templateMetadata("series-2026-10-25a")}
---

# {{ title }}

${ARTWORK_EMBED}

{{ overview }}
`

export const SERIES_TEMPLATE = {
	name: "Series Template",
	content: SERIES_TEMPLATE_CONTENT
}
