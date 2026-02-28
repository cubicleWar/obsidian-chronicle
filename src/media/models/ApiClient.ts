import { OmdbSearchResult } from "omdb/models/OmdbSearchResult.js"
import { MediaType } from "./MediaType.js"
import { SearchResult } from "./SearchResult.js"
import { Movie } from "./Movie.js"
import { Series } from "./Series.js"
import { TmdbSearchResult } from "tmdb/models/TmdbSearchResult.js"
import { OmdbMovie } from "omdb/models/OmdbMovie.js"
import { OmdbSeries } from "omdb/models/OmdbSeries.js"
import { TmdbMovie } from "tmdb/models/TmdbMovie.js"
import { TmdbSeries } from "tmdb/models/TmdbSeries.js"

export interface ApiClient
{
	readonly ID_NAME: "imdb_id" | "tmdb_id";
	search(search_str: string, type: MediaType) : Promise<(SearchResult | OmdbSearchResult | TmdbSearchResult)[]>
	getMovie(search_str: string | number) : Promise<Movie | OmdbMovie | TmdbMovie | null>
	getSeries(search_str: string | number) : Promise<Series | OmdbSeries | TmdbSeries | null>
}