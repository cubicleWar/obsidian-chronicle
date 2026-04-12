
export interface SeriesEpisode
{
	imdb_id: string | null;
	tmdb_id: number | null;
	title: string;
	overview: string;
	episode_number: number;
	released: string | null;
	runtime: number | null;
	season_number: number;
	rating: number | null;
}