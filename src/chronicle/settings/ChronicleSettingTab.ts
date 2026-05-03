import { App, PluginSettingTab, Setting, SearchComponent} from "obsidian";
import { Chronicle } from "../Chronicle";
import { FolderSuggestor } from "obsidianx/ui/FolderSuggestor.js";
import { FileSuggestor } from "obsidianx/ui/FileSuggestor.js";
import { StringKeys } from "utilities/models/types.js";

// Default templates
import { MOVIE_TEMPLATE } from "../templates/MovieTemplate.js";
import { SERIES_TEMPLATE } from "../templates/SeriesTemplate.js";
import { SERIES_SEASON_TEMPLATE } from "../templates/SeriesSeasonTemplate.js";
import { MINISERIES_TEMPLATE } from "../templates/MiniSeriesTemplate.js"
import { ChronicleSettings } from "./ChronicleSettings";

export class ChronicleSettingTab extends PluginSettingTab
{
	plugin: Chronicle;

	constructor(app: App, plugin: Chronicle)
	{
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void
	{
		const { containerEl } = this;

		containerEl.empty();

		this.displayApiSettings(containerEl);
		this.displayMovieSettings(containerEl);
		this.displaySeriesSettings(containerEl);
		this.displayMiniSeriesSettings(containerEl);
		this.displayGeneralSettings(containerEl);
	}

	displayApiSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl).setName("API Access Settings").setHeading();

		new Setting(containerEl)
			.setName('OMDb API key')
			.setDesc('Your API key to access Open Movie Database.')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.omdb_api_key)
				.onChange(async (value) => {
					this.plugin.settings.omdb_api_key = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('TMDB API key')
			.setDesc('Your API key to access The Movie Database.')
			.addTextArea(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.tmdb_api_key)
				.onChange(async (value) => {
					this.plugin.settings.tmdb_api_key = value;
					await this.plugin.saveSettings();
				}));
	}

	displayMovieSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl).setName("Movies").setHeading();

		this.createSearchSetting(containerEl, "movie_template_path", "Movie template", "The template used to create notes for movies.", "_templates/Movie Template.md", "file");

		this.createSearchSetting(containerEl, "movie_output_path", "Movie notes folder", "Where to save movie notes.", "Media/Movies", "folder")

	}

	displaySeriesSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl).setName("Series").setHeading();

		this.createSearchSetting(containerEl, "series_template_path", "Series template", "The template used to create notes for series.", "_templates/Series Template.md", "file");

		this.createSearchSetting(containerEl, "series_season_template_path", "Series Season template", "The template used to create notes for series seasons.", "_templates/Series Season Template.md", "file");

		this.createSearchSetting(containerEl, "series_output_path", "Series and Series Season notes location", "Where to save series notes.", "Media/Series", "folder");
	}

	displayMiniSeriesSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl)
			.setName('Differentiate miniseries')
			.setDesc('Treat Miniseries as a distinct format from regular Series and Seasons, complete with its own template and note location.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.differentiate_miniseries)
				.onChange(async (value) => {
					this.plugin.settings.differentiate_miniseries = value;
					await this.plugin.saveSettings();
				}));

		this.createSearchSetting(containerEl, "miniseries_template_path", "Miniseries template", "The template used to create notes for Miniseries.", "_templates/Miniseries Template.md", "file");

		this.createSearchSetting(containerEl, "miniseries_output_path", "Miniseries notes location", "Where to save Miniseries notes.", "Media/Miniseries", "folder");
	}

	displayGeneralSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl).setName("General Settings").setHeading();

		new Setting(containerEl)
			.setName('Export reference templates')
			.setDesc('Save reference templates for all media types to your vault for customize and use.')
			.addButton(btn => btn
				.setButtonText("Export Templates")
				.onClick((event) => {
					this.saveTemplates();
				}));

		new Setting(containerEl)
			.setName('Switch to generated notes')
			.setDesc('Automatically open of notes created or updated when chronicling media.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.switch_to_created_note)
				.onChange(async (value) => {
					this.plugin.settings.switch_to_created_note = value;
					await this.plugin.saveSettings();
				}));



		new Setting(containerEl)
			.setName('Save media artwork')
			.setDesc('Save artwork such as the movie posters locally to your vault when chronicling new media.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.save_artwork_locally)
				.onChange(async value => {
					this.plugin.settings.save_artwork_locally = value;
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		if (this.plugin.settings.save_artwork_locally)
		{
			this.createSearchSetting(containerEl, "artwork_output_path", "Artwork location", "The folder in which to save artwork such as movie posters.", "_attachments/artwork", "folder");
		}
	}

	// Export the example templates
	private async saveTemplates()
	{
		const templates = [
			MOVIE_TEMPLATE,
			SERIES_TEMPLATE,
			SERIES_SEASON_TEMPLATE,
			MINISERIES_TEMPLATE
		];

		for (const template of templates)
		{
			const file_path = `${template.name}.md`;
			await this.plugin.fileService.writeNote(file_path, template.content)
		}
	}

	// Create a text field setting with search
	private createSearchSetting(
		containerEl: HTMLElement,
		setting_name: StringKeys<ChronicleSettings>,
		name: string,
		description: string,
		placeholder: string = "",
		suggestor: "file" | "folder" | null = null
	) {
		const setting = new Setting(containerEl)
			.setName(name)
			.setDesc(description);

		setting.settingEl.addClass("stacked-setting");

		const fieldRow = setting.settingEl.createDiv({ cls: "stacked-setting-field" });

		const search = new SearchComponent(fieldRow);

		search
			.setPlaceholder(placeholder)
			.setValue(String(this.plugin.settings[setting_name]))
			.onChange(async (value) => {
				this.plugin.settings[setting_name] = value;
				await this.plugin.saveSettings();
			});

		if(suggestor === "file")
		{
			new FileSuggestor(search.inputEl, this.plugin.app);
		}
		else if(suggestor === "folder")
		{
			new FolderSuggestor(search.inputEl, this.plugin.app)
		}

		search.inputEl.addClass("stacked-search-input");
		search.inputEl.addClass("stacked-search-wrapper");
	}
}