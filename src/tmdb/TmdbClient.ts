import { TmdbMovie } from "./models/TmdbMovie.js";
import { TmdbSeries } from "./models/TmdbSeries.js";
import { TmdbFindResponse } from "./models/TmdbFindResponse.js";
import { TmdbSeriesSeason } from "./models/TmdbSeriesSeason.js";
import { TmdbSearchResponse } from "./models/TmdbSearchResponse";
import { TmdbSearchResult } from "./models/TmdbSearchResult";
import { parseTitleAndYear } from "utilities/parseTitleAndYear.js";
import { TmdbSeriesEpisode } from "./models/TmdbSeriesEpisode.js";
import { MediaType } from "media/models/MediaType.js";
import { SearchResult } from "media/models/SearchResult.js";
import { obsidianGetUrl } from "obsidianx/helpers/urlRequest.js";

type TmdbMedia = TmdbMovie | TmdbSeries | TmdbSeriesEpisode
type TmdbQuery = Record<string, string | number | null | undefined>;

export class TmdbClient
{
	static POSTER_BASE_URL = 'https://image.tmdb.org/t/p/original'
	readonly API_KEY: string;
	public readonly ID_NAME = 'tmdb_id';

	constructor(key: string)
	{
		if(!key)
		{
			throw Error("TMDB API Key is not set");
		}

		this.API_KEY = key;
	}

	async search(search_str: string, type: MediaType | null = null) : Promise<TmdbSearchResult[]>
	{
		const { title, year } = parseTitleAndYear(search_str);

		const path = '/search/' + (type === 'series' ? 'tv' : type ?? 'movie');

		const resp = await this.request<TmdbSearchResponse>(path, {query: title, year: year})

		if(resp === null)
		{
			return []
		}
		else
		{
			return resp.results;
		}
	}

	async find(type: MediaType, item: SearchResult) : Promise<TmdbMedia | null>
	{
		if(item.imdb_id)
		{
			const path = `/find/${item.imdb_id}`;
			const resp = await this.request<TmdbFindResponse>(path, {external_source: "imdb_id"})

			if(resp === null)
			{
				return null;
			}

			const tmdb_id = type === "movie" ? resp.movie_results?.[0]?.id : resp.tv_results?.[0]?.id;

			if(!tmdb_id)
			{
				return null;
			}

			if(type === "movie")
			{
				return this.getMovie(tmdb_id)
			}
			else if(type === "series")
			{
				return this.getSeries(tmdb_id);
			}
			else if(type === "episode")
			{
				return null;
			}
		}

		return null;
	}

	async getMovie(id: number | string) : Promise<TmdbMovie | null>
	{
		const path = `/movie/${id}`;

		return this.request<TmdbMovie>(path, {append_to_response: 'credits'});
	}

	async getSeries(id: number | string) : Promise<TmdbSeries | null>
	{
		const path = `/tv/${id}`;

		// Get the series
		return this.request<TmdbSeries>(path);
	}

	async getSeriesSeason(series_id: number | string, season_no: number) : Promise<TmdbSeriesSeason | null>
	{
		const path =  `/tv/${series_id}/season/${season_no}`;

		return this.request<TmdbSeriesSeason>(path);
	}

	async request<T>(path: string, query: TmdbQuery = {}) : Promise<T | null>
	{
		const query_params = {
			append_to_response : "external_ids,credits",
			...query
		}

		return obsidianGetUrl<T>(
			`https://api.themoviedb.org/3${path}`,
			{
				Authorization: `Bearer ${this.API_KEY}`,
				'Content-Type': 'application/json',
			},
			query_params
		);
	}
}
