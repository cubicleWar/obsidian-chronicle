

export interface OmdbBasicRequest
{
	apikey: string;							// OMDB API key
	r?: "json" | "xml";						// Data type of return
	type?: "movie" | "series" | "episode" | null;	// Type of media
}

export interface OmdSearchTerms
{
	i?: string | null;								// IMDB ID
	t?: string | null;								// Title
	y?: string | number | null;						// Year of release
	type?: "movie" | "series" | "episode" | null;	// Type of media
	plot?: "short" | "full";						// Return short or full plot.
	season?: string | number;
}

export interface OmdbSearchRequest extends OmdbBasicRequest
{
	s: string;										// The Title
	y?: string | number | null;						// Year of release
	page?: string;									// The page of results
}