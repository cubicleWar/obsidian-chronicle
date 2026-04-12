const SERIES_SEASON_TEMPLATE_CONTENT =
`---
tmdb_id: {{ tmdb_id }}
title: {{ title }}
series: {{ series_title }}
series_imdb_id: {{ series_imdb_id }}
series_tmdb_id: {{ series_tmdb_id }}
season: {{ season_number }}
rating: {{ rating }}
released: {{ released }}
episodes: {{ number_of_episodes }}
runtime: {{ runtime }}
average_runtime: {{ average_runtime }}
networks: {{ list networks }}
watch_dates: {{list watch_dates }}
---

# {{ series_title }} Season {{ season_no }}

{{ overview }}

{{ episode_table }}
`

export const SERIES_SEASON_TEMPLATE = {
	name: "Season Series Template",
	content: SERIES_SEASON_TEMPLATE_CONTENT
}