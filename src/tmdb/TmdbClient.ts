import { TmdbMovie } from "./models/TmdbMovie.js";
import { TmdbSeries } from "./models/TmdbSeries.js";
import { TmdbSearchRequest } from "./models/TmdbRequest";
import { TmdbSearchResponse } from "./models/TmdbSearchResponse";
import { TmdbSearchResult } from "./models/TmdbSearchResult";
import { parseTitleAndYear } from "utilities/parsing";

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

	async getMovie(id: number) : Promise<TmdbMovie | null>
	{
		const path = `/movie/${id}`;

		const details : TmdbMovie = await this.request(path, {append_to_response: 'credits'});

		return details;
	}

	async getSeries(id: number) : Promise<TmdbSeries | null>
	{
		const path = `/tv/${id}`;

		// Get the series
		const details : TmdbSeries = await this.request(path);

		return details;
	}

/*
	async searchSeries(title: string, { year : number, language = 'en-US' } = {})
	{
		const data = await this.get('/search/tv', { query: title, first_air_date_year: year, language });

		return data.results ?? [];
	}

	async getSeriesByTitle(title: string)
	{
		const searchResults = await this.searchSeries(title);

		if (searchResults.length > 0)
		{
			const best = searchResults[0];
			const data = await this.getSeriesByID(best.id);

			return this.normalizeSeries(data)
		}
		else
		{
			return null;
		}
	}

	async getSeriesByID(id)
	{
		if(id !== null)
		{
			const data = await this.get(`/tv/${id}`);

			return data;
		}
		else
		{
			throw new Error("No TMDB id provided when requesting series data by id");
		}
	}

	async getSeriesSeason(series, season_no, { language = 'en-US' } = {})
	{
		if(series && series?.tmdb_id !== undefined)
		{
			let season = await this.get(`/tv/${series.tmdb_id}/season/${season_no}`, { language });

			if(season !== null)
			{
				season = this.normalizeSeason(series, season);

				return season;
			}
		}

		return null;
	}
*/

	async request(path: string, query = {})
	{
		const url = new URL(`https://api.themoviedb.org/3${path}`);

		Object.entries(query).forEach(([k, v]) => {
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
			console.log(`TMDb ${res.status} ${res.statusText} for ${url.pathname}: ${text}`)

			return null;
		}

		return res.json();
	}
}

