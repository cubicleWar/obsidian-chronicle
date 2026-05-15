import { OmdbSearchResponse } from "./models/OmdbSearchResponse.js"
import { OmdbSeries } from "./models/OmdbSeries.js";
import { OmdbSeriesSeason } from "./models/OmdbSeriesSeason.js";
import { OmdSearchTerms, OmdbSearchRequest } from "./models/OmdbRequest.js";
import { OmdbMovie } from "./models/OmdbMovie.js";
import { OmdbSeriesEpisode } from "./models/OmdbSeriesEpisode.js";
import { parseTitleAndYear } from "../utilities/parseTitleAndYear.js"
import { OmdbSearchResult } from "./models/OmdbSearchResult.js"
import { obsidianGetUrl } from "obsidianx/helpers/urlRequest.js";
import { MediaType } from "media/models/MediaType.js";
import { SearchResult } from "media/models/SearchResult.js";

type OmdbMedia = OmdbMovie | OmdbSeries | OmdbSeriesEpisode

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

	async search(search_str: string, type: MediaType | null = null) : Promise<OmdbSearchResult[]>
	{
		const { title, year } = parseTitleAndYear(search_str);

		const resp = await this.request<OmdbSearchResponse>({s: title, type: type, y: year})

		if(resp === null)
		{
			return []
		}
		else
		{
			return resp.Search;
		}
	}

	async find(type: MediaType, item: SearchResult) : Promise<OmdbMedia | null>
	{
		let details : OmdbMedia | null = null;

		if(item.imdb_id)
		{
			details = await this.request<OmdbMedia>({i: item.imdb_id, type: type});
		}
		else
		{
			const title = item.title?.trim() ?? "";
			const year = item.year?.trim();

			// Search based on exact title - could fall back on a search after this but certainty degrades
			details = await this.request<OmdbMedia>({t: title, type: type, y: year});
		}

		return details;
	}

	async getMovie(id: string) : Promise<OmdbMovie | null>
	{
		const searchTerms: OmdSearchTerms = {
			i: id,
			type: 'movie'
		}

		return await this.request<OmdbMovie>(searchTerms);
	}

	async getSeries(id: string) : Promise<OmdbSeries | null>
	{
		return await this.request<OmdbSeries>({i: id, type: "series"})
	}

	async getSeriesSeason(series_id: string, season_no: number)  : Promise<OmdbSeriesSeason | null>
	{
		const query: OmdSearchTerms = {
			i: series_id,
			type: "series",
			season: String(season_no)
		};

		let season  = await this.request<OmdbSeriesSeason>(query)

		if(season !== null)
		{
			season = await this.enrichEpisodes(season)

			return season;
		}

		return null
	}

	async enrichEpisodes(season: OmdbSeriesSeason) : Promise<OmdbSeriesSeason>
	{
		if(Object.prototype.hasOwnProperty.call(season, 'Episodes'))
		{
			const episode_fetch : Array<Promise<OmdbSeriesEpisode | null>>  = [];

			for(let episode of season.Episodes)
			{
				episode_fetch.push(this.request<OmdbSeriesEpisode>({i: episode.imdbID}))
			}

			season.Episodes = (await Promise.all(episode_fetch)).filter(
				(episode): episode is OmdbSeriesEpisode => episode !== null
			);
		}

		return season;
	}

	async request<T>(searchTerms: OmdSearchTerms | OmdbSearchRequest) : Promise<T | null>
	{
		const query_params = {
			apikey: this.API_KEY,
			plot: "short",
			r: "json",
			...searchTerms
		}

		return obsidianGetUrl<T>(
			"https://www.omdbapi.com/",
			{},
			query_params
		)
	}
}
