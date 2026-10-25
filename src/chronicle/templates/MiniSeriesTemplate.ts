import { ARTWORK_PROPERTIES, ARTWORK_EMBED } from "./ArtworkTemplate.js";
import { templateMetadata } from "./TemplateMetadata.js";

const MINISERIES_TEMPLATE_CONTENT =
`---
title: {{ safeYamlString title }}
tmdb_id: {{ tmdb_id }}
series_tmdb_id: {{ series_tmdb_id }}
series_imdb_id: {{ safeYamlString series_imdb_id }}
categories: {{ yaml categories }}
genres: {{ yaml genres }}
cast: {{ yaml cast }}
rating: {{ rating }}
year: {{ year }}
released: {{ released }}
runtime: {{ runtime }}
average_runtime: {{ average_runtime }}
languages: {{ yaml languages }}
countries: {{ yaml countries }}
episodes: {{ number_of_episodes }}
${ARTWORK_PROPERTIES}
networks: {{ yaml networks }}
watch_dates: {{ yaml watch_dates }}
${templateMetadata("miniseries-2026-10-25a")}
---

# {{title}}

${ARTWORK_EMBED}

{{ overview }}

{{ episode_table }}
`

export const MINISERIES_TEMPLATE = {
	name: "Miniseries Template",
	content: MINISERIES_TEMPLATE_CONTENT
}
