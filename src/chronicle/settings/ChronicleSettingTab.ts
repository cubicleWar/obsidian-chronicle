import { App, PluginSettingTab, Setting, SearchComponent} from "obsidian";
import { Chronicle } from "../Chronicle";
import { StringKeys, ObjectKeys } from "utilities/models/types.js";
import { FolderSuggest } from "obsidianx/ui/FolderSuggest.js";
import { FileSuggest } from "obsidianx/ui/FileSuggest.js";

// Default templates
import { MOVIE_TEMPLATE } from "../templates/MovieTemplate.js";
import { SERIES_TEMPLATE } from "../templates/SeriesTemplate.js";
import { SERIES_SEASON_TEMPLATE } from "../templates/SeriesSeasonTemplate.js";
import { MINISERIES_TEMPLATE } from "../templates/MiniSeriesTemplate.js"
import { ChronicleSettings } from "./ChronicleSettings";
import { settingsValidator } from "./validator";

export class ChronicleSettingTab extends PluginSettingTab
{
	plugin: Chronicle;
	private statusElement?: HTMLElement;

	constructor(app: App, plugin: Chronicle)
	{
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void
	{
		const { containerEl } = this;

		containerEl.empty();

		// Display errors if required
		this.displayErrorInfo(containerEl);

		// Display the settings
		this.displayGeneralSettings(containerEl);
		this.displayApiSettings(containerEl);
		this.displayMovieSettings(containerEl);
		this.displaySeriesSettings(containerEl);
		this.displayMiniSeriesSettings(containerEl);

	}

	displayErrorInfo(containerEl?: HTMLElement)
	{
		if(!this.statusElement)
		{
			if(!containerEl) return;

			this.statusElement = containerEl.createDiv({cls: ["settings-error", "hidden"]});
		}

		this.statusElement.toggleClass("hidden", true)
		this.statusElement.empty();

		const validation = settingsValidator(this.plugin.settings);

		if(!validation.valid)
		{
			const errors = validation.errors;

			this.statusElement.createEl("strong", { text: "Chronicle configuration incomplete:"});

			if (errors.length)
			{
				this.statusElement.toggleClass("hidden", false)
				const ul = this.statusElement.createEl("ul");

				for (const error of errors)
				{
					ul.createEl("li", { text: error });
				}
			}
		}
	}

	displayApiSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl).setName("Data services").setHeading();

		new Setting(containerEl)
			.setName('Omdb API key')
			.setDesc('Your API key to access the open movie database.')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.omdb_api_key)
				.onChange((value) => {
					void this.updateSetting('omdb_api_key', value);
				})
			);

		new Setting(containerEl)
			.setName('Tmdb API key')
			.setDesc('Your API key to access the movie database.')
			.addTextArea(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.tmdb_api_key)
				.onChange((value) => {
					void this.updateSetting('tmdb_api_key', value);
				})
			);
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
		const setVisibility = () => {
			this.toggleSettingVisibility(template_setting, !this.plugin.settings.differentiate_miniseries)
			this.toggleSettingVisibility(output_setting, !this.plugin.settings.differentiate_miniseries)
		}

		new Setting(containerEl).setName("Miniseries").setHeading();

		new Setting(containerEl)
			.setName('Differentiate miniseries')
			.setDesc('Treat miniseries as a distinct format from regular series and seasons, complete with its own template and note location.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.differentiate_miniseries)
				.onChange((value) => {
					void this.updateSetting('differentiate_miniseries', value);
					setVisibility();
				}));

		const template_setting = this.createSearchSetting(containerEl, "miniseries_template_path", "Miniseries template", "The template used to create notes for Miniseries.", "_templates/Miniseries Template.md", "file");

		const output_setting = this.createSearchSetting(containerEl, "miniseries_output_path", "Miniseries notes location", "Where to save Miniseries notes.", "Media/Miniseries", "folder");

		setVisibility();
	}

	displayGeneralSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl)
			.setName('Export reference templates')
			.setDesc('Save reference templates for all media types in the root of your vault for customize and/or relocate and use.')
			.addButton(btn => btn
				.setButtonText("Export templates")
				.onClick(() => {
					void this.saveTemplates();
				}));

		new Setting(containerEl)
			.setName('Switch to generated notes')
			.setDesc('Automatically open of notes created or updated when chronicling media.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.switch_to_created_note)
				.onChange((value) => {
					void this.updateSetting('switch_to_created_note', value);
				})
			);



		new Setting(containerEl)
			.setName('Save media artwork')
			.setDesc('Save artwork such as the movie posters locally to your vault when chronicling new media.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.save_artwork_locally)
				.onChange((value) => {
					void this.updateSetting('save_artwork_locally', value)
					this.toggleSettingVisibility(artwork_setting, !value)
				}),
			);

		const artwork_setting = this.createSearchSetting(containerEl, "artwork_output_path", "Artwork location", "The folder in which to save artwork such as movie posters.", "_attachments/artwork", "folder");

		// Setup initial visibility state
		this.toggleSettingVisibility(artwork_setting, !this.plugin.settings.save_artwork_locally)
	}

	// Export the example templates
	private async saveTemplates() : Promise<void>
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
		type: "file" | "folder" | null = null,
		refesh_on_update: boolean = false,
		extension: string = '.md'
	) : Setting {

		const setting = new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addSearch((search: SearchComponent) => {
				search
					.setPlaceholder(placeholder)
					.setValue(String(this.plugin.settings[setting_name]))
					.onChange((value) => {
						void this.updateSetting(setting_name, value, refesh_on_update);
					});

				if (type === "folder")
				{
					new FolderSuggest(this.app, search.inputEl);
				}
				else
				{
					new FileSuggest(this.app, search.inputEl, extension);
				}
			});

		return setting;
	}

	// Add this to updateSetting
	private toggleSettingVisibility(setting: Setting, isDisabled: boolean)
	{
		setting.settingEl.toggleClass("is-disabled", isDisabled);
	}

	private async updateSetting<K extends ObjectKeys<ChronicleSettings>>(
		setting_name: K,
		value: ChronicleSettings[K],
		refresh: boolean = false
	) {
		this.plugin.settings[setting_name] = value;
		await this.plugin.saveSettings();
		this.displayErrorInfo();

		if(refresh)
		{
			this.display()
		}
	}
}
