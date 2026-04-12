import { OmdbSearchResponse } from "./models/OmdbSearchResponse.js"
import { OmdbSeries } from "./models/OmdbSeries.js";
import { OmdbSeriesSeason } from "./models/OmdbSeriesSeason.js";
import { OmdSearchTerms, OmdbSearchRequest } from "./models/OmdbRequest.js";
import { OmdbMovie } from "./models/OmdbMovie.js";
import { OmdbSeriesEpisode } from "./models/OmdbSeriesEpisode.js";
import { parseTitleAndYear } from "../utilities/parseTitleAndYear.js"
import { OmdbSearchResult } from "./models/OmdbSearchResult.js"

export class OmdbClient
{
	readonly API_KEY: string;
	public readonly ID_NAME = 'imdb_id';

	constructor(key: string)
	{
		if(!key)
		{
			throw Error("OMDB API Key is not set");
		}

		this.API_KEY = key;
	}

	async search(search_str: string, type: "movie" | "series" | "episode" | null = null) : Promise<OmdbSearchResult[]>
	{
		const { title, year } = parseTitleAndYear(search_str);

		const resp: OmdbSearchResponse = await this.request({s: title, type: type, y: year})

		if(resp === null)
		{
			return []
		}
		else
		{
			return resp.Search;
		}
	}

	async getMovie(id: string) : Promise<OmdbMovie | null>
	{
		const searchTerms: OmdSearchTerms = {
			i: id,
			type: 'movie'
		}

		const details : OmdbMovie = await this.request(searchTerms);

		return details
	}

	async getSeries(id: string) : Promise<OmdbSeries | null>
	{
		const data: OmdbSeries = await this.request({i: id, type: "series"})

		return data ?? null;
	}

	async getSeriesSeason(series_id: string, season_no: number)  : Promise<OmdbSeriesSeason | null>
	{
		let season: OmdbSeriesSeason = await this.request({i: series_id, type: "series", "season": season_no})

		if(season !== null)
		{
			// Todo: Enrich the epsiode data
			season = await this.enrichEpisodes(season)
			console.log("OMDB season")
			console.log(season)

			return season;
		}

		return null
	}

	async enrichEpisodes(season: OmdbSeriesSeason) : Promise<OmdbSeriesSeason>
	{
		if(season.hasOwnProperty('Episodes'))
		{
			const episode_fetch : Promise<OmdbSeriesEpisode>[]  = [];

			for(let episode of season.Episodes)
			{
				episode_fetch.push(this.request({i: episode.imdbID}))
			}

			season.Episodes = await Promise.all(episode_fetch)
		}

		return season;
	}

	async request(searchTerms: OmdSearchTerms | OmdbSearchRequest)
	{
		const cleanSearchTerms = Object.fromEntries(
			Object.entries(searchTerms).filter(([key, value]) => value != null)
		);

		const params = new URLSearchParams({
			apikey: this.API_KEY,
			plot: "short",
			r: "json",
			...cleanSearchTerms
		});

		const url = `https://www.omdbapi.com/?${params.toString()}`;

		const res = await fetch(url);

		if (!res.ok)
		{
			throw new Error(`OMDb request failed with HTTP ${res.status}`);
		}

		const data = await res.json();

		if (data.Response !== "True")
		{
			return null; // No confident match
		}
		else
		{
			return data;
		}
	}
}