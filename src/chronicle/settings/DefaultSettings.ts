import { ChronicleSettings } from "./ChronicleSettings";

export const DEFAULT_SETTINGS : ChronicleSettings = {
	omdb_api_key: '',
	tmdb_api_key: '',
	switch_to_created_note: true,

	movie_template_path: '',
	movie_output_path: 'Movies',

	series_template_path: '',
	series_season_template_path: '',
	series_output_path: 'Series',

	differentiate_miniseries: true,
	miniseries_template_path: '',
	miniseries_output_path: 'Miniseries',

	save_artwork_locally: true,
	artwork_output_path: ''
}
