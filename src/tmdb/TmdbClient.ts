import { TmdbMovie } from "./models/TmdbMovie.js";
import { TmdbSeries } from "./models/TmdbSeries.js";
import { TmdbSeriesSeason } from "./models/TmdbSeriesSeason.js";
import { TmdbSearchResponse } from "./models/TmdbSearchResponse";
import { TmdbSearchResult } from "./models/TmdbSearchResult";
import { parseTitleAndYear } from "utilities/parseTitleAndYear.js";
import { TmdbSeriesEpisode } from "./models/TmdbSeriesEpisode.js";

type TmdbMedia = TmdbMovie | TmdbSeries | TmdbSeriesEpisode

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

	async search(search_str: string, type: "movie" | "series" | "episode" | null = null) : Promise<TmdbSearchResult[]>
	{
		const { title, year } = parseTitleAndYear(search_str);

		const path = '/search/' + (type === 'series' ? 'tv' : type);

		const resp: TmdbSearchResponse = await this.request(path, {query: title, year: year})

		if(resp === null)
		{
			return []
		}
		else
		{
			return resp.results;
		}
	}

	async find(type: "movie" | "series" | "episode", item: any) : Promise<TmdbMedia | null>
	{
		if(item.imdb_id)
		{
			const path = `/find/${item.imdb_id}`;
			const resp = await this.request(path, {external_source: "imdb_id"})

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

		const details : TmdbMovie = await this.request(path, {append_to_response: 'credits'});

		return details;
	}

	async getSeries(id: number | string) : Promise<TmdbSeries | null>
	{
		const path = `/tv/${id}`;

		// Get the series
		const details : TmdbSeries = await this.request(path);

		return details;
	}

	async getSeriesSeason(series_id: number | string, season_no: number) : Promise<TmdbSeriesSeason | null>
	{
		const path =  `/tv/${series_id}/season/${season_no}`;

		const details : TmdbSeriesSeason = await this.request(path);

		return details;
	}

	async request(path: string, query = {})
	{
		const url = new URL(`https://api.themoviedb.org/3${path}`);

		const base_query = {
			append_to_response : "external_ids,credits"
		}

		const query_parameters = { ...base_query, ...query}

		Object.entries(query_parameters).forEach(([k, v]) => {
			if (v !== undefined && v !== null)
			{
				url.searchParams.set(k, String(v));
			}
		});

		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${this.API_KEY}`,
				'Content-Type': 'application/json',
			},
		});

		if (!res.ok)
		{
			const text = await res.text().catch(() => '');
			console.error(`TMDb ${res.status} ${res.statusText} for ${url.pathname}: ${text}`)

			return null;
		}

		return res.json();
	}
}

