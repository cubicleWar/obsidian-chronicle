const MOVIE_TEMPLATE_CONTENT =
`---
imdb_id: {{ imdb_id }}
tmdb_id: {{ tmdb_id }}
title: {{ safeYamlString title }}
categories: {{ list categories }}
genres: {{ list genres }}
director: {{ director }}
cast: {{ list cast }}
writers: {{ list writers }}
runtime: {{ runtime }}
year: {{ year }}
rating: {{ rating }}
rated: {{ rated }}
released: {{ released }}
languages: {{ languages }}
countries: {{ list countries }}
artwork: {{ backlink artwork_local }}
box_office: {{ box_office }}
watch_dates: {{ list watch_dates }}
---

# {{title}}

{{ backlink artwork_local "embed"}}

{{ overview }}
`

export const MOVIE_TEMPLATE = {
	name: "Movie Template",
	content: MOVIE_TEMPLATE_CONTENT
}