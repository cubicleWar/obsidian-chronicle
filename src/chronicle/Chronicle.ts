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

		this.fileService = new VaultFileService(this.app.vault);
		this.mediaService = new MediaDataOrchestrator(this.settingsService);

		this.addCommand({
			id: "chronicle-movie-search",
			name: "Chronicle Movie",
			callback: this.addOrUpdateMovie
		});



		this.addCommand({
			id: "omdb-search",
			name: "Chronicle media",
			callback: async () => {
				const modal = new MediaSearchModal(this.app, this.mediaService);

				const picked = await modal.openAndGetChoice();

				if(picked && picked.item !== null)
				{
					const type = picked.type;

					if(type === 'movie')
					{


						const movie = await this.mediaService.getMovie(picked.item);

						if(movie)
						{
							const template_path = this.settingsService.getSetting('movie_template_path')
							const movie_path = this.settingsService.getSetting('movie_output_path');

							const render = new NoteRenderer<Movie>(this.fileService, template_path)

							const note = await render.render(movie);

							const path = `${movie_path}/${movie.title} (${movie.year}).md`;

							this.fileService.writeNote(path, note)


							new Notice(`Picked: ${movie.title} (${movie.year}) - ${movie.plot}`);
						}
					}
					else if(type === 'series')
					{

						// Get the season in detail
						const series = await this.mediaService.getSeries(picked.item)

						if(series !== null)
						{
							// Show a secondary model to select the second
							const modal = new SeriesSeasonSelectModal(this.app, this.mediaService, series);
							const season = await modal.openAndGetChoice();

							console.log(season);
						}
					}
				}

				// Then: fetch details by imdbID if you need more fields:
				// https://www.omdbapi.com/?apikey=KEY&i=IMDBID&plot=full
				return null;
			}
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

				let note = await this.fileService.loadNote(path);

				if(note === null)
				{
					// Note does not exist - create a new note
					const render = new NoteRenderer<Movie>(this.fileService, template_path)

					note = await render.render(movie);
				}
				else
				{
					// Note exists - update the note watch add
				}




				this.fileService.writeNote(path, note, true)


				new Notice(`Created New entry: ${movie.title} (${movie.year}) - ${movie.plot}`);
			}
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