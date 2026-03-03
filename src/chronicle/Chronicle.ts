import { Plugin, Notice } from "obsidian";
import { ChronicleSettings } from "./settings/ChronicleSettings.js";
import { DEFAULT_SETTINGS } from "./settings/DefaultSettings.js";
import { ChronicleSettingTab } from "./settings/ChronicleSettingTab.js";
import { MediaSearchModal } from "./ui/MediaSearchModal.js"
import { MediaDataOrchestrator } from "./MediaDataOrchestrator.js";
import { VaultFileService } from "utilities/VaultFileService.js";
import { Movie } from "media/models/Movie.js";
import { NoteRenderer } from "./NoteRenderer.js";
import { SettingsService } from "utilities/Settings.service.js";
import { SeriesSeasonSelectModal } from "./ui/SeriesSeasonSelectModal.js";

export class Chronicle extends Plugin
{
	settings: ChronicleSettings = DEFAULT_SETTINGS;
	settingsService = new SettingsService<ChronicleSettings>(DEFAULT_SETTINGS);
	mediaService: MediaDataOrchestrator;
	fileService: VaultFileService;

	async onload()
	{
		console.log("Obsidian Chronicle Loaded");
		await this.loadSettings();

		this.fileService = new VaultFileService(this.app, this.app.vault);
		this.mediaService = new MediaDataOrchestrator(this.settingsService);

		this.addCommand({
			id: "chronicle-movie-search",
			name: "Chronicle Movie",
			callback: async () => this.addOrUpdateMovie()
		});

		this.addCommand({
			id: "chronicle-series-search",
			name: "Chronicle TV Series",
			callback: async () => this.addOrUpdateSeriesSeason()
		});

		// Add the Settings
		this.addSettingTab(new ChronicleSettingTab(this.app, this));
	}


	async addOrUpdateMovie()
	{
		const modal = new MediaSearchModal(this.app, this.mediaService, "movie");

		const picked = await modal.openAndGetChoice();

		if(picked && picked.item !== null)
		{
			const movie = await this.mediaService.getMovie(picked.item);

			if(movie)
			{
				const template_path = this.settingsService.getSetting('movie_template_path')
				const movie_path = this.settingsService.getSetting('movie_output_path');

				const path = `${movie_path}/${movie.title} (${movie.year}).md`;

				const note_reference = this.fileService.getTFile(path);

				if(note_reference === null)
				{
					// Note does not exist - create a new note
					const render = new NoteRenderer<Movie>(this.fileService, template_path)

					const note = await render.render(movie);

					this.fileService.writeNote(path, note, true)
				}
				else
				{
					// Note exists - Just update to add a watch date

					await this.fileService.updateFrontmatterAttribute(note_reference, 'watch_dates', '2026-02-27', false, true);
				}


				this.savePoster(movie)

				new Notice(`Created New entry: ${movie.title} (${movie.year}) - ${movie.plot}`);
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
			const series = await this.mediaService.getSeries(picked.item)

			// Get the season details
			if(series !== null)
			{
				let season_no : number | null = 1;

				if(!series.miniseries)
				{
					// Show a secondary model to select the second
					const modal = new SeriesSeasonSelectModal(this.app, this.mediaService, series);
					season_no = await modal.openAndGetChoice();

					console.log(season_no);
				}


			}

			// Save the series


			// Save the season
		}
	}

	async savePoster(media : Movie, overwrite: boolean = true) : Promise<void>
	{
		if(this.settings.save_posters_locally && media.poster)
		{
			await this.fileService.addFileFromUrl(media.poster, media.poster_local, overwrite)
		}
	}


	////////////////////////////////////////////////////////////////////////////
	// Utilities
	////////////////////////////////////////////////////////////////////////////

	onunload()
	{
		console.log("Obsidian Chronicle Unloaded");
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
}