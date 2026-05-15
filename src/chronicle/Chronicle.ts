import { App, Plugin, Notice, TFile } from "obsidian";
import { ChronicleSettings } from "./settings/ChronicleSettings.js";
import { DEFAULT_SETTINGS } from "./settings/DefaultSettings.js";
import { settingsValidator } from "./settings/validator.js"
import { ChronicleSettingTab } from "./settings/ChronicleSettingTab.js";
import { MediaSearchModal } from "./ui/MediaSearchModal.js"
import { MediaDataOrchestrator } from "./MediaDataOrchestrator.js";

import { VaultFileService } from "obsidianx/services/VaultFileService.js";
import { NoteManager } from "obsidianx/services/NoteManager.js"
import { SettingsService } from "obsidianx/services/Settings.service.js";
import { slugifyFilename } from "obsidianx/helpers/formatters.js";

import { Movie } from "media/models/Movie.js";
import { Series } from "media/models/Series.js";
import { SeriesSeason } from "media/models/SeriesSeason.js";
import { Miniseries } from "media/models/Miniseries.js";
import { ArtworkOwner } from "media/models/ArtworkOwner.js";

import { SeriesSeasonSelectModal } from "./ui/SeriesSeasonSelectModal.js";
import { getCurrentIsoDate } from "utilities/Dates.js";



export class Chronicle extends Plugin
{
	settings: ChronicleSettings = DEFAULT_SETTINGS;
	settingsService = new SettingsService<ChronicleSettings>(DEFAULT_SETTINGS, settingsValidator);
	mediaService!: MediaDataOrchestrator;
	fileService!: VaultFileService;
	note_manager!: NoteManager;

	async onload()
	{
		await this.loadSettings();

		this.fileService = new VaultFileService(this.app, this.app.vault);
		this.mediaService = new MediaDataOrchestrator(this.settingsService);
		this.note_manager = new NoteManager(this.fileService)

		this.addCommand({
			id: "movie-search",
			name: "Movie",
			callback: async () => this.addOrUpdateMovie()
		});

		this.addCommand({
			id: "series-search",
			name: "Series",
			callback: async () => this.addOrUpdateSeriesSeason()
		});

		// Add the Settings
		this.addSettingTab(new ChronicleSettingTab(this.app, this));
	}

	async addOrUpdateMovie()
	{
		if(!this.ensureSettings("movie")) return;

		const modal = new MediaSearchModal(this.app, this.mediaService, "movie");

		const picked = await modal.openAndGetChoice();

		if(picked && picked.item !== null)
		{
			const movie = await this.mediaService.get("movie", picked.item);

			if(movie)
			{
				const file_name = slugifyFilename(`${movie.title} (${movie.year}).md`);
				const paths = this.getPaths('movie', file_name);

				if(paths !== null)
				{
					const { template_path, file_path } = paths
					const watch_date = { "watch_dates" : picked.mark_watched ? [getCurrentIsoDate()] : []}

					const file_reference = await this.note_manager.createOrUpdateNote<Movie>(movie, template_path, file_path, watch_date)

					void this.saveArtwork(movie)

					this.announceNoteCreation(file_reference, `${movie.title} (${movie.year}) - ${movie.overview}`)
				}
			}
		}
	}

	async addOrUpdateSeriesSeason()
	{
		const modal = new MediaSearchModal(this.app, this.mediaService, "series");
		const picked = await modal.openAndGetChoice();

		if(picked && picked.item !== null)
		{
			// Get the season in detail
			const series = await this.mediaService.get("series", picked.item)
			const watch_date = { "watch_dates" : picked.mark_watched ? [getCurrentIsoDate()] : []}

			// Get the season details
			if(series !== null)
			{
				let season_no : number | null = 1;
				const series_file_name = slugifyFilename(`${series.title}.md`);
				const isMiniseries = series.miniseries;

				void this.saveArtwork(series)

				if(!isMiniseries)
				{
					// Show a secondary model to select the season
					const modal = new SeriesSeasonSelectModal(this.app, this.mediaService, series);
					season_no = await modal.openAndGetChoice();
				}

				if(season_no !== null)
				{
					// Get the season details
					const season = await this.mediaService.getSeriesSeason(series, season_no);

					if(season !== null)
					{
						if(isMiniseries && this.settings.differentiate_miniseries)
						{
							// Merge the series and season data
							const miniseries = this.mediaService.generateMiniseries(series, season);

							// Save as miniseries
							const paths = this.getPaths("miniseries", series_file_name)

							if(paths !== null)
							{
								const { template_path, file_path } = paths;

								const file_reference = await this.note_manager.createOrUpdateNote<Miniseries>(miniseries, template_path, file_path, watch_date)

								this.announceNoteCreation(file_reference, `${series.title} Season ${season.season_number}) - ${season.overview}`);
							}
						}
						else
						{
							season.series_link = series_file_name;

							const season_file_name = slugifyFilename(`${series.title} (Season ${season_no}).md`)

							// Save the Series
							const series_paths = this.getPaths("series", series_file_name);
							const season_paths = this.getPaths("series_season", season_file_name)

							if(series_paths !== null && season_paths !== null)
							{
								await this.note_manager.createOrUpdateNote<Series>(series, series_paths.template_path, series_paths.file_path, watch_date)

								// Save the Season
								const file_reference = await this.note_manager.createOrUpdateNote<SeriesSeason>(season, season_paths.template_path, season_paths.file_path, watch_date)

								this.announceNoteCreation(file_reference, `${series.title} Season ${season.season_number}) - ${season.overview}`)
							}
						}
					}
				}
			}
		}
	}

	////////////////////////////////////////////////////////////////////////////
	// Utilities
	////////////////////////////////////////////////////////////////////////////

	onunload()
	{

	}

	async loadSettings()
	{
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ChronicleSettings>);
		this.settingsService.set(this.settings);
	}

	async saveSettings()
	{
		await this.saveData(this.settings);

		this.settingsService.set(this.settings);
	}

	async saveArtwork(media : ArtworkOwner, overwrite: boolean = true) : Promise<void>
	{
		if(this.settings.save_artwork_locally && media.artwork && media.artwork_local)
		{
			await this.fileService.addFileFromUrl(media.artwork, media.artwork_local, overwrite)
		}
	}

	private announceNoteCreation(note_reference: TFile | null, msg: string | null)
	{
		if(this.settings.switch_to_created_note && note_reference)
		{
			void this.fileService.openNote(note_reference);
		}

		if(msg)
		{
			new Notice(`Created new note: ${msg}`);
		}
	}

	private getPaths(type: "movie" | "series" | "series_season" | "miniseries", file_name: string) : null | { template_path: string, file_path: string }
	{
		const type_output_prefix = type === "series_season" ? "series" : type;

		const output_path = this.settings[`${type_output_prefix}_output_path`];
		const template_path = this.settings[`${type}_template_path`];
		const file_path = `${output_path}/${file_name}`;

		// Check that the template exists
		const isTemplateSet = this.fileService.getTFile(template_path) !== null;

		if(!isTemplateSet)
		{
			new Notice(`A template has not been specified for the media type '${type}'.`)
			return null;
		}

		return {
			template_path : template_path,
			file_path: file_path
		}
	}

	private ensureSettings(mode: string)
	{
		const results = this.settingsService.validate(mode);

		if(!results.valid)
		{
			this.openSettings();
			return false;
		}

		return true;
	}

	private openSettings()
	{
		// This is a work around to access via private API
		// Public API alternative is to just show a Notice
		type ObsidianAppWithSettings = App & {
			setting: {
				open(): void;
				openTabById(id: string): void;
			};
		};


		const settingsApp = this.app as ObsidianAppWithSettings;
		settingsApp.setting.open();

		settingsApp.setting.openTabById(this.manifest.id);
	}
}