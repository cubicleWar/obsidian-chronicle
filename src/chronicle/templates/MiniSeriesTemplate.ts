const MINISERIES_TEMPLATE_CONTENT =
`---
imdb_id: {{ imdb_id }}
tmdb_id: {{ tmdb_id }}
title: {{ safeYamlString title }}
categories: {{ list categories }}
genres: {{ list genres }}
cast: {{cast}}
rating: {{ rating }}
year: {{ year }}
released: {{ released }}
runtime: {{ runtime }}
average_runtime: {{ average_runtime }}
languages: {{ list languages }}
countries: {{ list countries }}
episodes: {{ number_of_episodes }}
poster: {{ backlink artwork_local }}
networks: {{ list networks }}
watch_dates: {{ list watch_dates }}
---

# {{title}}

{{ backlink artwork_local "embed"}}

{{ overview }}

{{ episode_table }}
`

export const MINISERIES_TEMPLATE = {
	name: "Miniseries Template",
	content: MINISERIES_TEMPLATE_CONTENT
}