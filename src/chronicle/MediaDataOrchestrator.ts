import { OmdbClient } from "omdb/OmdbClient.js";
import { MediaType } from "../media/models/MediaType.js";
import { ApiClient } from "../media/models/ApiClient.js";
import { SearchResult } from "../media/models/SearchResult.js";
import * as OmdbNormalizer from "media/services/OmdbNormalizer.js";
import * as TmdbNormalizer from "media/services/TmdbNormalizer.js"
import { Movie } from "media/models/Movie.js";
import { Series } from "media/models/Series.js";
import { ChronicleSettings } from "./settings/ChronicleSettings.js";
import { SettingsService } from "utilities/Settings.service.js";
import { EventRef, NullValue } from "obsidian";
import { TmdbClient } from "tmdb/TmdbClient.js";
import { MediaNormalizer } from "media/models/MediaNormalizer.js";
import { coalesce } from "utilities/utilities.js";

type ClientSet = { source: string, client: ApiClient, normalizer: MediaNormalizer}

export class MediaDataOrchestrator
{
	public readonly id_name = 'id';
	private omdb_token: string;
	private tmdb_token: string;
	private omdb: OmdbClient | null;
	private tmdb: TmdbClient | null;

	private settingsService: SettingsService<ChronicleSettings>;
	private settingsEvt: EventRef;

	private poster_path: string;

	constructor(settingsService: SettingsService<ChronicleSettings>)
	{
		this.settingsService = settingsService;
		this.settingsEvt = this.settingsService.onChanged(() => this.updateSettings());

		this.updateSettings();
	}

	async search(search_str: string, type: MediaType) : Promise<SearchResult[]>
	{
		const sets = this.getClients(type);

		if(sets.length > 0)
		{
			const set = <ClientSet>sets[0];

			const results = await set.client.search(search_str, type);

			return set.normalizer.getSearchResults(results);
		}

		return [];
	}

	async getMovie(item: SearchResult) : Promise<Movie | null>
	{
		const clients = this.getClients("movie");
		let results = [];

		for(let i = 0, len = clients.length; i < len; i++)
		{
			const { client, normalizer } = <ClientSet>clients[i];

			const id = item[client.ID_NAME]

			if(id !== null)
			{
				const result = await client.getMovie(id)

				if(result !== null)
				{
					results.push(normalizer.getMovie(result, this.poster_path));
				}
			}
		}

		// Enrich by merging data from each API
		if(results.length === 0)
		{
			return null;
		}
		else
		{
			// Return the first one for now - Todo merge results
			return <Movie>results[0];
		}
	}

	async getSeries(item: SearchResult) : Promise<Series | null>
	{
		const clients = this.getClients("series");
		let results = [];

		for(let i = 0, len = clients.length; i < len; i++)
		{
			const { client, normalizer } = <ClientSet>clients[i];

			const id = item[client.ID_NAME]

			if(id !== null)
			{
				const result = await client.getSeries(id)

				if(result !== null)
				{
					results.push(normalizer.getSeries(result, this.poster_path));
				}
			}
		}

		return results[0] ?? null;
	}
/*
	async getSeriesSeason(series: Series, season: number) : Promise<SeriesSeason | null>
	{

	}
*/
	private updateSettings()
	{
		// Update the API Clients
		const omdb_token = this.settingsService.getSetting("omdb_api_key");

		if(this.omdb_token !== omdb_token)
		{
			this.omdb = omdb_token ? new OmdbClient(omdb_token) : null;
		}

		const tmdb_token = this.settingsService.getSetting("tmdb_api_key");

		if(this.tmdb_token !== tmdb_token)
		{
			this.tmdb_token = tmdb_token;
			this.tmdb = tmdb_token ? new TmdbClient(tmdb_token) : null;
		}

		// Update other settings
		this.poster_path = this.settingsService.getSetting("poster_output_path");
	}

	// Returns an array of Client Sets (ApiClients and their associated normalizers)
	// Only ApiClients that have been configured by the user will be returned
	// The clients are ordered by the best for the associated media type
	private getClients(type: MediaType) : ClientSet[]
	{
		const omdbSet : (ClientSet | null) = this.omdb !== null ? { source: "omdb", client: this.omdb, normalizer: OmdbNormalizer } : null,
			tmdbSet : (ClientSet | null)  = this.tmdb !== null ? { source: "tmdb", client: this.tmdb, normalizer: TmdbNormalizer } : null;

		let sets = [];

		if(omdbSet !== null || tmdbSet !== null)
		{
			if(type === "series")
			{
				// Prioritize tmdb if configured
				if(tmdbSet !== null) sets.push(tmdbSet);
				if(omdbSet !== null) sets.push(omdbSet);
			}
			else
			{
				// default to omdb for everything else
				if(omdbSet !== null) sets.push(omdbSet);
				if(tmdbSet !== null) sets.push(tmdbSet);
			}
		}

		return sets;
	}
}