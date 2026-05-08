export interface ChronicleSettings
{
	// General
	switch_to_created_note: boolean;
	save_artwork_locally: boolean;
	artwork_output_path: string;

	// API keys
	omdb_api_key: string;
	tmdb_api_key: string;

	// Movies
	movie_output_path: string;
	movie_template_path: string;


	// Series
	series_template_path: string;
	series_season_template_path: string;
	series_output_path: string;

	// Miniseries
	differentiate_miniseries: boolean;
	miniseries_template_path: string;
	miniseries_output_path: string;
}