import {App, PluginSettingTab, Setting} from "obsidian";
import { Chronicle } from "..//Chronicle";
import { FolderSuggest } from "suggestors/FolderSuggestor";
import { FileSuggest } from "suggestors/FileSuggestor";

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
		const {containerEl} = this;

		containerEl.empty();

		this.displayApiSettings(containerEl);
		this.displayMovieSettings(containerEl);
		this.displaySeriesSettings(containerEl);
		this.displayPosterSettings(containerEl);






		new Setting(containerEl)
			.setName('Plot length')
			.setDesc('choose the plot length option for Omdb.')
			.addDropdown(dropDown => dropDown
				.addOption('short', 'short')
				.addOption('full', 'full')
				.setValue(this.plugin.settings.plot_length)
				.onChange(async (value) => {
					this.plugin.settings.plot_length = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Switch to generated notes')
			.setDesc('Automatically switch to the current workspace to the newly created note')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.switch_to_created_note)
				.onChange(async (value) => {
					this.plugin.settings.switch_to_created_note = value;
					await this.plugin.saveSettings();
				}));







		new Setting(containerEl)
			.setName('Create example template file')
			.setDesc('Creates an example template file to expand and use.\nThe file is called `/Moviegrabber-example-template`')
			.addButton(btn => btn
				.setButtonText("Create")
				.onClick((event) => {
					//this.plugin.CreateDefaultTemplateFile();
				}));




	}

	displayApiSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl).setName("API Access Settings").setHeading();

		new Setting(containerEl)
			.setName('OMDb API key')
			.setDesc('Your API key for OMDb')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.omdb_api_key)
				.onChange(async (value) => {
					this.plugin.settings.omdb_api_key = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('TMDB API key')
			.setDesc('Your API key for TMDB')
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

		new Setting(containerEl)
			.setName('Movie template file path')
			.setDesc('Path to the template file that is used to create notes for movies')
			.addSearch((cb) => {
				new FileSuggest(cb.inputEl, this.plugin.app);
				cb.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.movie_template_path)
					.onChange(async (newFile) => {
						this.plugin.settings.movie_template_path = newFile;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Movie Note Folder')
			.setDesc('Folder in which to save the generated notes for series')
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl, this.plugin.app);
				cb.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.movie_output_path)
					.onChange(async (newFolder) => {
						this.plugin.settings.movie_output_path = newFolder;
						await this.plugin.saveSettings();
					});
			});

	}

	displaySeriesSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl).setName("Series").setHeading();

		new Setting(containerEl)
			.setName('Series filename template')
			.setDesc('Template used for the filename of Movienotes. Used same template tags as other files.')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.series_template_path)
				.onChange(async (value) => {
					this.plugin.settings.series_template_path = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Series folder')
			.setDesc('Folder in which to save the generated notes for series')
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl, this.plugin.app);
				cb.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.series_output_path)
					.onChange(async (newFolder) => {
						this.plugin.settings.series_output_path = newFolder;
						await this.plugin.saveSettings();
					});
			});



	}

	displayPosterSettings(containerEl: HTMLElement)
	{
		new Setting(containerEl).setName("media Posters").setHeading();

		new Setting(containerEl)
			.setName('Enable poster image saving')
			.setDesc('Toggle to enable or disable saving movie poster images as files.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.save_posters_locally)
				.onChange(async value => {
					this.plugin.settings.save_posters_locally = value;
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		if (this.plugin.settings.save_posters_locally)
		{
			new Setting(containerEl)
			.setName('Poster image directory')
			.setDesc('Specify the path where poster images should be saved.')
			.addSearch(cb => {
				new FolderSuggest(cb.inputEl, this.plugin.app);
				cb.setPlaceholder("Enter the path (e.g., Movies/Posters)")
					.setValue(this.plugin.settings.poster_output_path)
					.onChange(async value => {
						this.plugin.settings.poster_output_path = value.trim();
						await this.plugin.saveSettings();
					});
			});
		}
	}
}