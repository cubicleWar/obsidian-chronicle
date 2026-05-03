import { OmdbClient } from "omdb/OmdbClient.js";
import { MediaType } from "../media/models/MediaType.js";
import { SearchResult } from "../media/models/SearchResult.js";
import * as OmdbNormalizer from "media/services/OmdbNormalizer.js";
import * as TmdbNormalizer from "media/services/TmdbNormalizer.js"
import { Movie } from "media/models/Movie.js";
import { Series } from "media/models/Series.js";
import { Miniseries } from "media/models/Miniseries.js";
import { ChronicleSettings } from "./settings/ChronicleSettings.js";
import { SettingsService } from "obsidianx/services/Settings.service.js";
import { EventRef } from "obsidian";
import { TmdbClient } from "tmdb/TmdbClient.js";
import { SeriesSeason } from "media/models/SeriesSeason.js";
import { mergeObjects } from "utilities/entity-unify/merge.js";
import { resolveFingerprintSpecs } from "media/utilities/resolveFingerprintSpecs.js"
import { makeFingerprint } from "utilities/entity-unify/fingerprint.js"

type ClientSet = {
	id_name: "imdb_id" | "tmdb_id",
	search: {
		get: (search_str: string, type: MediaType) => any,
		normalize: (data: any) => SearchResult[]
	},
	find: (type: MediaType, item: SearchResult) => any | null,
	movie: {
		get: (id: string) => any,
		normalize: (data: any, artwork: string) => Movie
	},
	series: {
		get: (id: string) => any,
		normalize: (data: any, artwork: string) => Series
	}
	season: {
		get: (id: string, season: number) => any
		normalize: (series: Series, data: any) => SeriesSeason
	}
}

export class MediaDataOrchestrator
{
	public readonly id_name = 'id';
	private omdb_token: string | null = null;
	private tmdb_token: string | null = null;
	private omdb: OmdbClient | null = null;
	private tmdb: TmdbClient | null = null;

	private settingsEvt: EventRef;

	private artwork_path: string = "";

	constructor(private settingsService: SettingsService<ChronicleSettings>)
	{
		this.settingsEvt = this.settingsService.onChanged(() => this.updateSettings());

		this.updateSettings();
	}

	async search(search_str: string, type: MediaType) : Promise<SearchResult[]>
	{
		const sets = this.getClients(type);

		if(sets.length > 0)
		{
			const set = <ClientSet>sets[0];

			const results = await set.search.get(search_str, type);

			return set.search.normalize(results);
		}

		return [];
	}

	async get(type: "movie", item: SearchResult): Promise<Movie | null>;
	async get(type: "series", item: SearchResult): Promise<Series | null>;
	async get(type: "movie" | "series", item: SearchResult) : Promise<Movie | Series | null>
	{
		const clients : ClientSet[] = this.getClients(type);
		let results = [];

		for(const clientSet of clients)
		{
			let id = <string | null>item[clientSet.id_name];

			const result = id ? await clientSet[type].get(id) : await clientSet.find(type, item);

			if(result !== null)
			{
				results.push(clientSet[type].normalize(result, this.artwork_path));
			}
		}

		return mergeObjects<any>(results, makeFingerprint(resolveFingerprintSpecs));
	}

	async getSeriesSeason(series: Series, season_no: number) : Promise<SeriesSeason | null>
	{
		const clients = this.getClients("series");
		let results : SeriesSeason[] = [];

		for(const clientSet of clients)
		{
			const id = <string | null>series[clientSet.id_name];

			// Todo fallback when tmdb_id is not present?
			if(id)
			{
				const result = await clientSet["season"].get(id, season_no)

				if(result !== null)
				{
					results.push(clientSet["season"].normalize(series, result));
				}
			}
		}

		return mergeObjects<any>(results, makeFingerprint(resolveFingerprintSpecs));
	}

	// Merges together series and season data to form a Miniseries
	generateMiniseries(series: Series, season: SeriesSeason) : Miniseries
	{
		const miniseries : Miniseries = {
			title: series.title,
			imdb_id: season.imdb_id,
			tmdb_id: season.tmdb_id,
			series_tmdb_id: season.series_tmdb_id,
			series_imdb_id: season.series_imdb_id,
			season_number: season.season_number,
			miniseries: series.miniseries,
			categories: series.categories,
			genres: series.genres,
			cast: season.cast,
			year: season.released ? Number(season.released.slice(0, 4)) : null,
			released: season.released,
			status: series.status,
			countries: series.countries,
			languages: series.languages,
			created_by: series.created_by,
			overview: season.overview,
			artwork: series.artwork,
			artwork_local: series.artwork_local,
			rating: season.rating,
			networks: season.networks,
			runtime: season.runtime,
			average_runtime: season.average_runtime,
			number_of_episodes: season.number_of_episodes,
			episodes: season.episodes,
			episode_table: season.episode_table
		}

		return miniseries;
	}

	////////////////////////////////////////////////////////////////////////////////
	// Utility Functions
	////////////////////////////////////////////////////////////////////////////////

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
		this.artwork_path = this.settingsService.getSetting("artwork_output_path");
	}

	// Returns an array of Client Sets (ApiClients and their associated normalizers)
	// Only ApiClients that have been configured by the user will be returned
	// The clients are ordered by the best for the associated media type
	private getClients(type: MediaType) : ClientSet[]
	{
		let omdbSet: ClientSet | null = null,
			tmdbSet: ClientSet | null = null;

		const omdb = this.omdb;

		if(omdb !== null)
		{
			omdbSet = {
				id_name: "imdb_id",
				find: omdb.find.bind(omdb),
				search: {
					get: omdb.search.bind(omdb),
					normalize: OmdbNormalizer.getSearchResults
				},
				movie: {
					get: omdb.getMovie.bind(omdb),
					normalize: OmdbNormalizer.getMovie
				},
				series: {
					get: omdb.getSeries.bind(omdb),
					normalize: OmdbNormalizer.getSeries
				},
				season: {
					get: omdb.getSeriesSeason.bind(omdb),
					normalize: OmdbNormalizer.getSeriesSeason
				}
			}
		}

		const tmdb = this.tmdb;

		if(tmdb !== null)
		{
			tmdbSet = {
				id_name: "tmdb_id",
				find: tmdb.find.bind(tmdb),
				search: {
					get: tmdb.search.bind(tmdb),
					normalize: TmdbNormalizer.getSearchResults
				},
				movie: {
					get: tmdb.getMovie.bind(tmdb),
					normalize: TmdbNormalizer.getMovie
				},
				series: {
					get: tmdb.getSeries.bind(tmdb),
					normalize: TmdbNormalizer.getSeries
				},
				season: {
					get: tmdb.getSeriesSeason.bind(tmdb),
					normalize: TmdbNormalizer.getSeriesSeason
				}
			}
		}

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