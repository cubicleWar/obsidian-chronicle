import { ChronicleSettings } from "./ChronicleSettings";

export const DEFAULT_SETTINGS : ChronicleSettings = {
	movie_path: 'Movies',
	series_path: 'Series',
	omdb_api_key: '',
	tmdb_api_key: '',
	switch_to_created_note: true,

	movie_template_path: '',
	series_template_path: '',
	miniseries_template_path: '',

	movie_output_path: '',
	series_output_path: '',
	miniseries_output_path: '',

	save_posters_locally: true,
	poster_output_path: '',

	plot_length: 'short',
}
