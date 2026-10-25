import { EventRef } from "obsidian";
import { SearchResult } from "media/models/SearchResult.js";
import { Book } from "media/models/Book.js";
import { ChronicleSettings } from "../settings/ChronicleSettings.js";
import { SettingsService } from "obsidianx/services/Settings.service.js";
import { DataOrchestrator } from "./DataOrchestrator.js";
import { OpenLibraryClient } from "openlibrary/OpenLibraryClient.js";
import { GoogleBooksClient } from "googlebooks/GoogleBooksClient.js";
import * as OpenLibraryNormalizer from "media/services/OpenLibraryNormalizer.js";
import * as GoogleBooksNormalizer from "media/services/GoogleBooksNormalizer.js";
import { bookIsbns, enrichBook, sameEdition, sameWork } from "media/utilities/bookMatching.js";
import { getArtworkLocalPath } from "media/utilities/artworkPath.js";
import { estimateWordCount } from "media/utilities/estimateWordCount.js";

type Provider = {
	idName: "google_library_id" | "open_library_id";
	search: (query: string) => Promise<SearchResult[]>;
	get: (item: SearchResult) => Promise<Book | null>;
	findByIsbn: (isbn: string) => Promise<Book | null>;
	findWork: (book: Book) => Promise<Book | null>;
};

export class BookDataOrchestrator implements DataOrchestrator<Book>
{
	public readonly id_name = "id";
	private olib!: OpenLibraryClient;
	private google_books!: GoogleBooksClient;
	private settingsEvt: EventRef;
	private artwork_path = "";

	constructor(private settingsService: SettingsService<ChronicleSettings>)
	{
		this.settingsEvt = settingsService.onChanged(() => this.updateSettings());
		this.updateSettings();
	}

	async search(query: string, type: "book"): Promise<SearchResult[]>
	{
		let failure: Error | undefined;

		for(const provider of this.getProviders())
		{
			try
			{
				const results = await provider.search(query);
				if(results.length) return results;
			}
			catch(error)
			{
				failure = error instanceof Error ? error : new Error("Book search failed.", { cause: error });
			}
		}

		if(failure)
		{
			throw failure;
		}

		return [];
	}

	async get(type: "book", item: SearchResult): Promise<Book | null>
	{
		const providers = this.getProviders();
		const selected = providers.find(provider => !!item.ids[provider.idName]);
		if(!selected)
		{
			return null;
		}

		let book = await selected.get(item);

		if(!book)
		{
			return null;
		}

		for(const provider of providers.filter(provider => provider !== selected))
		{
			try
			{
				let match: Book | null = null;

				// Bound enrichment requests; the first matching ISBN identifies
				// the selected edition, including equivalent ISBN-10/ISBN-13.
				for(const isbn of bookIsbns(book).slice(0, 2))
				{
					const candidate = await provider.findByIsbn(isbn);
					if(candidate && sameEdition(book, candidate)) { match = candidate; break; }
				}

				match ??= await provider.findWork(book);

				if(match)
				{
					book = enrichBook(book, match);
				}
			}
			catch(error)
			{
				// Secondary service failure must not prevent recording the book.
				console.warn("Book enrichment unavailable", error);
			}
		}

		book.estimated_word_count = estimateWordCount(book);
		const year = book.publication_year ?? book.first_publication_year;
		const artworkTitle = `${book.title}${year !== null ? ` (${year})` : ""}`;
		book.artwork_local = getArtworkLocalPath(artworkTitle, book.artwork, this.artwork_path);

		return book;
	}

	private updateSettings(): void
	{
		const olibToken = this.settingsService.getSetting("olib_api_key").trim();
		const googleToken = this.settingsService.getSetting("gb_api_key").trim() || null;

		// Keep caches and the request queue across unrelated settings changes.
		if(!this.olib || this.olib.API_KEY !== olibToken)
		{
			this.olib = new OpenLibraryClient(olibToken);
		}

		if(!this.google_books || this.google_books.API_KEY !== googleToken)
		{
			this.google_books = new GoogleBooksClient(googleToken);
		}

		this.artwork_path = this.settingsService.getSetting("artwork_output_path");
	}

	private getProviders(): Provider[]
	{
		const google = this.google_books;
		const olib = this.olib;
		const providers: Provider[] = [];
		const normalizeGoogle = (data: Parameters<typeof GoogleBooksNormalizer.getBook>[0]) => GoogleBooksNormalizer.getBook(data, this.artwork_path);
		const normalizeOpenLibrary = (data: Parameters<typeof OpenLibraryNormalizer.getBook>[0]) => OpenLibraryNormalizer.getBook(data, this.artwork_path);

		providers.push({
			idName: "google_library_id",
			search: async query => GoogleBooksNormalizer.getSearchResults(await google.search(query)),
			get: async item => {
				const volume = await google.getBook(item.ids.google_library_id!);
				return volume ? normalizeGoogle(volume) : null;
			},
			findByIsbn: async isbn => {
				const volume = await google.findByIsbn(isbn);
				return volume ? normalizeGoogle(volume) : null;
			},
			findWork: async book => {
				if(!book.authors.length)
				{
					return null;
				}

				const candidates = (await google.search(book.title)).map(normalizeGoogle).filter(candidate => sameWork(book, candidate));

				if(candidates.length !== 1)
				{
					return null;
				}

				const volume = await google.getBook(candidates[0]!.gb_id!);

				return volume ? normalizeGoogle(volume) : null;
			}
		});

		providers.push({
			idName: "open_library_id",
			search: async query => OpenLibraryNormalizer.getSearchResults(await olib.search(query)),
			get: async item => {
				const data = await olib.getBook(item.ids.open_library_id!, item.ids.open_library_edition_id);
				return data ? normalizeOpenLibrary(data) : null;
			},
			findByIsbn: async isbn => {
				const data = await olib.findByIsbn(isbn);
				return data ? normalizeOpenLibrary(data) : null;
			},
			findWork: async book => {
				if(!book.authors.length)
				{
					return null;
				}

				const candidates = (await olib.search(book.title)).filter(candidate => sameWork(book, {
					title: candidate.editions?.docs?.[0]?.title ?? candidate.title, authors: candidate.author_name ?? []
				}));

				if(candidates.length !== 1)
				{
					return null;
				}

				const data = await olib.getBook(candidates[0]!.key);

				return data ? normalizeOpenLibrary(data) : null;
			}
		});

		return providers;
	}
}
