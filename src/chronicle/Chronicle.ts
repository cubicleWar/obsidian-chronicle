import { App, Plugin, Notice, TFile, normalizePath } from "obsidian";
import { ChronicleSettings } from "./settings/ChronicleSettings.js";
import { DEFAULT_SETTINGS } from "./settings/DefaultSettings.js";
import { settingsValidator } from "./settings/validator.js"
import { ChronicleSettingTab } from "./settings/ChronicleSettingTab.js";
import { MediaSearchModal } from "./ui/MediaSearchModal.js"
import { MediaDataOrchestrator } from "./services/MediaDataOrchestrator.js";

import { VaultFileService } from "obsidianx/services/VaultFileService.js";
import { NoteManager } from "obsidianx/services/NoteManager.js"
import { SettingsService } from "obsidianx/services/Settings.service.js";
import { slugifyFilename } from "obsidianx/helpers/formatters.js";

import { SearchResult } from "media/models/SearchResult.js";
import { Movie } from "media/models/Movie.js";
import { Series } from "media/models/Series.js";
import { SeriesSeason } from "media/models/SeriesSeason.js";
import { Miniseries } from "media/models/Miniseries.js";
import { ArtworkOwner } from "media/models/ArtworkOwner.js";

import { SeriesSeasonSelectModal } from "./ui/SeriesSeasonSelectModal.js";
import { getCurrentIsoDate } from "utilities/Dates.js";
import { Book } from "media/models/Book.js";
import { BookDataOrchestrator } from "./services/BookDataOrchestrator.js";
import { SavedNoteSelectModal } from "./ui/SavedNoteSelectModal.js";
import { matchesBookSearch } from "media/utilities/bookNoteMatching.js";
import { matchesBookNote } from "media/utilities/bookMatching.js";
import { matchesMediaNote, MediaNoteType } from "media/utilities/mediaNoteMatching.js";



export class Chronicle extends Plugin
{
	settings: ChronicleSettings = DEFAULT_SETTINGS;
	settingsService = new SettingsService<ChronicleSettings>(DEFAULT_SETTINGS, settingsValidator);
	mediaService!: MediaDataOrchestrator;
	fileService!: VaultFileService;
	bookService!: BookDataOrchestrator;
	note_manager!: NoteManager;

	async onload()
	{
		await this.loadSettings();

		this.fileService = new VaultFileService(this.app, this.app.vault);
		this.mediaService = new MediaDataOrchestrator(this.settingsService);
		this.bookService = new BookDataOrchestrator(this.settingsService);
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

		this.addCommand({
			id: "book-search",
			name: "Book",
			callback: async () => this.addOrUpdateBook()
		});

		// Add the Settings
		this.addSettingTab(new ChronicleSettingTab(this.app, this));
	}

	async addOrUpdateMovie()
	{
		try
		{
			const picked = await new MediaSearchModal(this.app, this.mediaService, "movie").openAndGetChoice();
			if(!picked?.item)
			{
				return;
			}

			if(await this.updateExistingSelection("movie", picked.item, picked.mark_complete))
			{
				return;
			}

			if(!this.ensureSettings("movie"))
			{
				return;
			}

			const movie = await this.mediaService.get("movie", picked.item);
			if(!movie)
			{
				new Notice("Could not retrieve the selected movie.");
				return;
			}

			if(await this.updateExistingSelection("movie", { ...picked.item, ids: { ...picked.item.ids, imdb_id: movie.imdb_id, tmdb_id: movie.tmdb_id } }, picked.mark_complete))
			{
				return;
			}

			const paths = this.getPaths("movie", `${slugifyFilename(`${movie.title} (${movie.year})`)}.md`);

			if(!paths)
			{
				return;
			}

			const target = this.resolveNote(paths.file_path, fm => matchesMediaNote("movie", movie, fm));
			await this.prepareArtwork(movie, target.previous);
			const file = await this.saveMediaNote(movie, paths.template_path, target.path, picked.mark_complete);
			await this.announceNoteSave(file, !!target.previous, "movie", movie.title);
		}
		catch(error)
		{
			this.reportSaveError("movie", error);
		}
	}

	async addOrUpdateSeriesSeason()
	{
		try
		{
			const picked = await new MediaSearchModal(this.app, this.mediaService, "series").openAndGetChoice();
			if(!picked?.item) return;
			const series = await this.mediaService.get("series", picked.item);
			if(!series)
			{
				new Notice("Could not retrieve the selected series.");
				return;
			}
			const seasonNo = series.miniseries ? 1 : await new SeriesSeasonSelectModal(this.app, this.mediaService, series).openAndGetChoice();

			if(seasonNo === null)
			{
				return;
			}

			if(await this.updateExistingSeason(series, seasonNo, picked.mark_complete))
			{
				return;
			}

			const season = await this.mediaService.getSeriesSeason(series, seasonNo);

			if(!season)
			{
				new Notice("Could not retrieve the selected season.");
				return;
			}

			const seriesFilename = `${slugifyFilename(series.title)}.md`;

			if(series.miniseries && this.settings.differentiate_miniseries)
			{
				const media = this.mediaService.generateMiniseries(series, season);
				const paths = this.getPaths("miniseries", seriesFilename);

				if(!paths)
				{
					return;
				}

				const target = this.resolveNote(paths.file_path, fm => matchesMediaNote("miniseries", media, fm));
				await this.prepareArtwork(media, target.previous);
				const file = await this.saveMediaNote(media, paths.template_path, target.path, picked.mark_complete);
				await this.announceNoteSave(file, !!target.previous, "miniseries", media.title);
			}
			else
			{
				const seriesPaths = this.getPaths("series", seriesFilename);
				const seasonSuffix = ` (Season ${seasonNo})`;
				const seasonFilename = `${slugifyFilename(series.title).slice(0, 180 - seasonSuffix.length)}${seasonSuffix}.md`;
				const seasonPaths = this.getPaths("series_season", seasonFilename);

				if(!seriesPaths || !seasonPaths)
				{
					return;
				}

				const parent = this.resolveNote(seriesPaths.file_path, fm => matchesMediaNote("series", series, fm));
				const target = this.resolveNote(seasonPaths.file_path, fm => matchesMediaNote("series_season", season, fm));
				// Use the actual vault path, including any rename or collision suffix.
				season.series_link = parent.path;
				await this.prepareArtwork(series, parent.previous);
				await this.saveMediaNote(series, seriesPaths.template_path, parent.path);
				const file = await this.saveMediaNote(season, seasonPaths.template_path, target.path, picked.mark_complete);
				await this.announceNoteSave(file, !!target.previous, "season", `${series.title} Season ${seasonNo}`);
			}
		}
		catch(error)
		{
			this.reportSaveError("series", error);
		}
	}

	async addOrUpdateBook()
	{
		try
		{
			const book_meta_fn = (r: SearchResult): string => `${r.primary_artist ? `${r.primary_artist} • ` : ""}${r.year ? `(${r.year})` : ""}`;

			const modal = new MediaSearchModal(this.app, this.bookService, "book", book_meta_fn);

			const picked = await modal.openAndGetChoice();

			if(!picked || !picked.item)
			{
				return;
			}

			if(await this.updateExistingSelection("book", picked.item, picked.mark_complete))
			{
				return;
			}

			const book = await this.bookService.get("book", picked.item);

			if(!book)
			{
				new Notice("Could not retrieve the selected book.");
				return;
			}

			if(await this.updateExistingSelection("book", { ...picked.item, ids: { ...picked.item.ids, google_library_id: book.gb_id, open_library_id: book.olib_id, open_library_edition_id: book.olib_edition_id } }, picked.mark_complete))
			{
				return;
			}

			const year = book.publication_year ?? book.first_publication_year;
			const title = `${book.title}${year !== null ? ` (${year})` : ""}`;
			const file_name = `${slugifyFilename(title)}.md`;
			const paths = this.getPaths("book", file_name);

			if(!paths)
			{
				return;
			}

			const bookId = book.gb_id ?? book.olib_edition_id?.split("/").pop() ?? book.olib_id?.split("/").pop();
			const target = this.resolveNote(paths.file_path, fm => matchesBookNote(book, fm), bookId);
			const { previous, path: file_path } = target;
			await this.prepareArtwork(book, previous);

			const read_dates = picked.mark_complete ? [getCurrentIsoDate()] : [];
			const file = await this.note_manager.createOrUpdateNote<Book>(book, paths.template_path, file_path, { read_dates });

			if(!file)
			{
				throw new Error("No note was saved.");
			}

			// Keep identifiers learned through enrichment even on existing notes,
			// so switching search providers can still locate the same note.
			await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				for(const key of ["gb_id", "olib_id", "olib_edition_id"] as const)
				{
					if(book[key] && !fm[key])
					{
						fm[key] = book[key];
					}
				}

				if(!previous && !("read_dates" in fm))
				{
					fm.read_dates = read_dates;
				}
			});

			await this.announceNoteSave(file, !!previous, "book", book.title);
		}
		catch(error)
		{
			this.reportSaveError("book", error);
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
		const saved = await this.loadData() as (Partial<ChronicleSettings> & { book_data_source?: unknown }) | null;
		const current = { ...saved };
		// Provider selection is derived from configured services, not legacy choices.
		delete current.book_data_source;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, current);

		this.settingsService.set(this.settings);
	}

	async saveSettings()
	{
		await this.saveData(this.settings);

		this.settingsService.set(this.settings);
	}

	async saveArtwork(media : ArtworkOwner, overwrite: boolean = true) : Promise<void>
	{
		if(!this.settings.save_artwork_locally || !media.artwork || !media.artwork_local)
		{
			media.artwork_local = "";
			return;
		}

		try
		{
			if(!overwrite && this.fileService.getTFile(media.artwork_local))
			{
				return;
			}

			await this.fileService.addFileFromUrl(media.artwork, media.artwork_local, overwrite)
		}
		catch(error)
		{
			media.artwork_local = "";
			throw error;
		}
	}

	private async prepareArtwork(media: ArtworkOwner, previous: TFile | null = null): Promise<void>
	{
		if(this.settings.save_artwork_locally)
		{
			const fm = previous ? this.app.metadataCache.getFileCache(previous)?.frontmatter : undefined;
			let savedPath: string | null = null;

			for(const key of ["artwork_local", "artwork", "poster"])
			{
				const value: unknown = fm?.[key];

				if(typeof value !== "string" || !value || /^https?:/i.test(value))
				{
					continue;
				}

				const path = value.replace(/^!?\[\[(.*)\]\]$/, "$1").split("|")[0]?.split("#")[0];

				if(!path) continue;

				const file = this.fileService.getTFile(path)
					?? this.app.metadataCache.getFirstLinkpathDest?.(path, previous?.path ?? "");

				if(file)
				{
					savedPath = file.path;
					break;
				}
			}
			if(savedPath)
			{
				media.artwork_local = savedPath;
				return;
			}

			if(media.artwork_local)
			{
				media.artwork_local = this.availablePath(media.artwork_local);
			}
		}

		try
		{
			await this.saveArtwork(media, false);
		}
		catch(error)
		{
			console.warn("Chronicle could not save artwork", error);
			new Notice("Could not save the cover locally. The note will use the online cover.");
		}
	}

	private findNotes(matches: (fm: Record<string, unknown>) => boolean): TFile[]
	{
		return this.app.vault.getMarkdownFiles().filter(file => matches(this.app.metadataCache.getFileCache(file)?.frontmatter ?? {}));
	}

	private async chooseSavedNote(notes: TFile[], title: string): Promise<TFile | null>
	{
		if(notes.length === 1)
		{
			return notes[0]!;
		}

		const choice = await new SavedNoteSelectModal(this.app, title, notes.map(file => ({ file, label: file.path }))).openAndGetChoice();

		return choice;
	}

	private async logExistingNote(file: TFile, type: "book" | "movie" | "season" | "miniseries", complete: boolean): Promise<void>
	{
		if(complete)
		{
			await this.fileService.updateFrontmatterAttribute(file, type === "book" ? "read_dates" : "watch_dates", [getCurrentIsoDate()], false, true);
		}

		const title: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.title;
		await this.announceNoteSave(file, true, type, typeof title === "string" ? title : file.path, complete);
	}

	private async updateExistingSeason(series: Series, season: number, complete: boolean): Promise<boolean>
	{
		const mini = series.miniseries && this.settings.differentiate_miniseries;
		const identity = { series_imdb_id: series.imdb_id, series_tmdb_id: series.tmdb_id, season_number: season };
		const notes = this.findNotes(fm => matchesMediaNote(mini ? "miniseries" : "series_season", identity, fm));

		if(!notes.length)
		{
			return false;
		}

		const file = await this.chooseSavedNote(notes, "Choose the saved note to update");

		if(!file)
		{
			return true;
		}

		await this.logExistingNote(file, mini ? "miniseries" : "season", complete);

		return true;
	}

	private async updateExistingSelection(type: "movie" | "book", item: SearchResult, complete: boolean): Promise<boolean>
	{
		if(!item.ids)
		{
			return false;
		}

		const notes = this.findNotes(fm => type === "book" ? matchesBookSearch(item, fm) : matchesMediaNote("movie", item.ids, fm));

		if(!notes.length)
		{
			return false;
		}

		const file = await this.chooseSavedNote(notes, "Choose the saved note to update");

		if(file)
		{
			await this.logExistingNote(file, type, complete);
		}

		return true;
	}

	private availablePath(path: string): string
	{
		const dot = path.lastIndexOf(".");
		let candidate = path;
		let suffix = 2;

		while(this.app.vault.getAbstractFileByPath(candidate))
		{
			candidate = `${path.slice(0, dot)} (${suffix++})${path.slice(dot)}`;
		}

		return candidate;
	}

	private resolveNote(defaultPath: string, matches: (fm: Record<string, unknown>) => boolean, suffix?: string | null): { path: string; previous: TFile | null }
	{
		const previous = this.app.vault.getMarkdownFiles().find(file => matches(this.app.metadataCache.getFileCache(file)?.frontmatter ?? {})) ?? null;

		if(previous)
		{
			return {
				path: previous.path,
				previous
			};
		}

		let path = defaultPath;

		if(suffix && this.app.vault.getAbstractFileByPath(path))
		{
			path = `${path.slice(0, -3).slice(0, 200)} (${slugifyFilename(suffix)}).md`;
		}

		return {
			path: this.availablePath(path),
			previous: null
		};
	}

	private async saveMediaNote(media: Movie | Series | SeriesSeason | Miniseries, template: string, path: string, complete?: boolean): Promise<TFile>
	{
		// Parent series notes have no completion dates; only their seasons do.
		const dates = complete === undefined ? undefined : { watch_dates: complete ? [getCurrentIsoDate()] : [] };
		const file = await this.note_manager.createOrUpdateNote(media, template, path, dates);

		if(!file)
		{
			throw new Error("No note was saved.");
		}

		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			for(const key of ["imdb_id", "tmdb_id"] as const)
			{
				if(media[key] && !fm[key]) fm[key] = media[key];
			}

			if("series_tmdb_id" in media)
			{
				for(const key of ["series_imdb_id", "series_tmdb_id"] as const)
				{
					if(media[key] && !fm[key]) fm[key] = media[key];
				}
			}
		});

		return file;
	}

	private async announceNoteSave(file: TFile, updated: boolean, type: MediaNoteType | "book" | "season", title: string, changed = true): Promise<void>
	{
		new Notice(`${!changed ? "Found" : updated ? "Updated" : "Created"} ${type} note: ${title}`);

		if(this.settings.switch_to_created_note)
		{
			try
			{
				await this.fileService.openNote(file);
			}
			catch(error)
			{
				console.warn("Chronicle saved the note but could not open it", error);
				new Notice("The note was saved, but could not be opened.");
			}
		}
	}

	private reportSaveError(type: string, error: unknown): void
	{
		console.error(`Chronicle could not save the ${type} note`, error);
		new Notice(`Could not save the ${type} note. Check the data provider, template and output folder.${type === "series" ? " If a series note was already saved, it has been preserved." : ""}`);
	}

	private getPaths(type: "movie" | "series" | "series_season" | "miniseries" | "book", file_name: string) : null | { template_path: string, file_path: string }
	{
		const type_output_prefix = type === "series_season" ? "series" : type;

		const output_path = this.settings[`${type_output_prefix}_output_path`];
		const template_path = this.settings[`${type}_template_path`];
		const file_path = normalizePath(`${output_path}/${file_name}`);

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
