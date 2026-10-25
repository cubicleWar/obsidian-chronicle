import { templateMetadata } from "./TemplateMetadata.js";

const SERIES_SEASON_TEMPLATE_CONTENT =
`---
title: {{ safeYamlString title }}
tmdb_id: {{ tmdb_id }}
series: {{ safeYamlString series_title }}
series_note: {{ backlink series_link }}
series_imdb_id: {{ safeYamlString series_imdb_id }}
series_tmdb_id: {{ series_tmdb_id }}
season: {{ season_number }}
rating: {{ rating }}
released: {{ released }}
episodes: {{ number_of_episodes }}
runtime: {{ runtime }}
average_runtime: {{ average_runtime }}
networks: {{ yaml networks }}
watch_dates: {{ yaml watch_dates }}
${templateMetadata("series_season-2026-10-25a")}
---

# {{ series_title }} Season {{ season_number }}

{{ overview }}

{{ episode_table }}
`

export const SERIES_SEASON_TEMPLATE = {
	name: "Season Series Template",
	content: SERIES_SEASON_TEMPLATE_CONTENT
}
