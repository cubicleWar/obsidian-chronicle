export interface ChronicleSettings
{
	// API keys
	omdb_api_key: string;
	tmdb_api_key: string;

	// Movies
	movie_path: string;
	movie_output_path: string;
	movie_template_path: string;


	// Series
	series_path: string;
	series_output_path: string;
	series_template_path: string;

	// Miniseries
	miniseries_output_path: string;
	miniseries_template_path: string;

	// Functional settings
	switch_to_created_note: boolean;
	save_posters_locally: boolean;
	poster_output_path: string;
	plot_length: string;
}