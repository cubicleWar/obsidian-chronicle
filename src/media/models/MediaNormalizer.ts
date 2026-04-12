
import { SearchResult } from "media/models/SearchResult.js";
import { Movie } from "media/models/Movie.js";
import { Series } from "media/models/Series.js";
import { SeriesSeason } from "./SeriesSeason";

export interface MediaNormalizer
{
	getSearchResults(data: any[]) : SearchResult[];
	getMovie(data: any, image_path: string) : Movie;
	getSeries(data: any, image_path: string) : Series;
	getSeriesSeason(series: Series, data: any) : SeriesSeason;
}