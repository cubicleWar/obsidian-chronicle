export interface OmdbSearchResult
{
	Title: string;
	Year: string;
	Type: "movie" | "series" | "episode";
	imdbID: string;
	Poster?: string;
}