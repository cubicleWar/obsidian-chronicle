const SERIES_TEMPLATE_CONTENT =
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
languages: {{ list languages }}
countries: {{ list countries }}
seasons: {{ number_of_seasons }}
episodes: {{ number_of_episodes }}
poster: {{ backlink artwork_local }}
networks: {{ list networks }}
---

# {{ title }}

{{ backlink artwork_local "embed"}}

{{ overview }}
`

export const SERIES_TEMPLATE = {
	name: "Series Template",
	content: SERIES_TEMPLATE_CONTENT
}