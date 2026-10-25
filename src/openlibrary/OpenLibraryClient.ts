import { requestUrl } from "obsidian";
import { OpenLibraryBook } from "./models/OpenLibraryBook.js";
import { OpenLibraryQuery, OL_FIELDS_QUERY } from "./models/OpenLibraryQuery.js";
import { OpenLibrarySearchResponse } from "./models/OpenLibrarySearchResponse.js";
import { OpenLibrarySearchResult } from "./models/OpenLibrarySearchResult.js";
import { OpenLibraryWork } from "./models/OpenLibraryWork.js";
import { OpenLibraryEdition } from "./models/OpenLibraryEdition.js";
import { OpenLibraryAuthor } from "./models/OpenLibraryAuthor.js";
import { getOlibTextReference } from "./helpers.js";

export class OpenLibraryClient
{
	static readonly BASE_URL = "https://openlibrary.org";
	private queue: Promise<unknown> = Promise.resolve();
	private nextRequestAt = 0;
	private readonly requestIntervalMs: number;
	private readonly cache = new Map<string, { value: unknown; expires: number }>();
	private readonly inFlight = new Map<string, Promise<unknown>>();
	private readonly searchResults = new Map<string, OpenLibrarySearchResult>();

	constructor(readonly API_KEY: string = "")
	{
		// Open Library allows 1 request/sec, or 3/sec with contact identification.
		this.requestIntervalMs = API_KEY.trim() ? 350 : 1000;
	}

	async search(search_str: string, type: "book" = "book", limit = 10): Promise<OpenLibrarySearchResult[]>
	{
		const title = search_str.trim();

		if(!title)
		{
			return [];
		}

		const response = await this.request<OpenLibrarySearchResponse>("/search.json", {
			title, limit, fields: OL_FIELDS_QUERY
		});
		const docs = response?.docs ?? [];

		for(const doc of docs)
		{
			this.searchResults.set(this.normalizeKey(doc.key), doc);
		}

		while(this.searchResults.size > 100)
		{
			const oldest = this.searchResults.keys().next();

			if(!oldest.done)
			{
				this.searchResults.delete(oldest.value);
			}
		}
		return docs;
	}

	async getBook(key: string, editionKey?: string | null): Promise<OpenLibraryBook | null>
	{
		const path = this.normalizeKey(key);
		let work: OpenLibraryWork | null;
		let edition: OpenLibraryEdition | null = null;
		const seed = this.searchResults.get(path);

		if(path.startsWith("/books/"))
		{
			edition = await this.getEdition(path);

			if(!edition)
			{
				return null;
			}

			const workKey = edition.works?.[0]?.key;
			work = workKey ? await this.optional(() => this.getWork(workKey)) : null;
		}
		else
		{
			work = await this.getWork(path);

			if(!work)
			{
				return null;
			}

			const preferred = editionKey ?? seed?.editions?.docs?.[0]?.key ?? seed?.cover_edition_key;

			if(preferred)
			{
				edition = await this.optional(() => this.getEdition(preferred));
			}

			if(edition?.works?.length && !edition.works.some(ref => this.normalizeKey(ref.key) === path))
			{
				edition = null;
			}

			if(!edition)
			{
				// Bound the request: select one representative edition, never scan
				// every edition or mix their publication metadata together.
				const editions = await this.optional(() => this.request<{ entries?: OpenLibraryEdition[] }>(`${path}/editions.json`, { limit: 20 }));
				edition = [...(editions?.entries ?? [])].sort((a, b) => this.editionScore(b) - this.editionScore(a))[0] ?? null;
			}
		}

		return this.combine(work, edition, seed);
	}

	async findByIsbn(isbn: string): Promise<OpenLibraryBook | null>
	{
		const clean = isbn.replace(/[-\s]/g, "").toUpperCase();

		if(!/^(?:\d{13}|\d{9}[\dX])$/.test(clean))
		{
			return null;
		}

		const edition = await this.request<OpenLibraryEdition>(`/isbn/${clean}.json`);

		if(!edition)
		{
			return null;
		}

		const workKey = edition.works?.[0]?.key;
		const work = workKey ? await this.optional(() => this.getWork(workKey)) : null;

		return this.combine(work, edition);
	}

	async getWork(key: string): Promise<OpenLibraryWork | null>
	{
		const path = this.normalizeKey(key);

		if(!path.startsWith("/works/"))
		{
			return null;
		}

		return this.request<OpenLibraryWork>(`${path}.json`);
	}

	async getEdition(key: string): Promise<OpenLibraryEdition | null>
	{
		const path = this.normalizeKey(key);

		if(!path.startsWith("/books/"))
		{
			return null;
		}

		return this.request<OpenLibraryEdition>(`${path}.json`);
	}

	private async combine(work: OpenLibraryWork | null, edition: OpenLibraryEdition | null, seed?: OpenLibrarySearchResult): Promise<OpenLibraryBook | null>
	{
		if(!work && !edition)
		{
			return null;
		}

		let authors = seed?.author_name ?? [];

		if(!authors.length)
		{
			const refs = edition?.authors?.length ? edition.authors : work?.authors?.map(ref => ref.author) ?? [];
			const details = await Promise.all(refs.map(ref => this.optional(() =>
				this.request<OpenLibraryAuthor>(`${this.normalizeKey(ref.key)}.json`)
			)));
			authors = details.flatMap(author => author?.name ? [author.name] : []);
		}

		const cover = [...(edition?.covers ?? []), ...(work?.covers ?? []), seed?.cover_i].find(id => id !== undefined && id > 0);
		const firstYear = work?.first_publish_date?.match(/\b(\d{4})\b/)?.[1];

		return {
			key: work ? this.normalizeKey(work.key) : this.normalizeKey(edition!.key),
			edition_key: edition ? this.normalizeKey(edition.key) : null,
			edition_name: edition?.edition_name?.trim() || null,
			title: edition?.title ?? work?.title ?? seed?.title ?? "Untitled",
			subtitle: edition?.subtitle,
			authors,
			description: getOlibTextReference(edition?.description) ?? getOlibTextReference(work?.description),
			subjects: work?.subjects ?? [],
			cover_id: cover ?? null,
			first_publish_year: seed?.first_publish_year ?? (firstYear ? Number(firstYear) : null),
			publish_date: edition?.publish_date ?? null,
			number_of_pages: edition?.number_of_pages ?? null,
			publishers: edition?.publishers ?? [],
			isbn_10: edition?.isbn_10 ?? [],
			isbn_13: edition?.isbn_13 ?? [],
			languages: edition?.languages?.map(ref => ref.key.replace("/languages/", "")) ?? []
		};
	}

	private editionScore(edition: OpenLibraryEdition): number
	{
		return Number(!!edition.number_of_pages) + Number(!!edition.publishers?.length)
			+ Number(!!edition.publish_date) + Number(!!edition.isbn_13?.length)
			+ Number(!!edition.isbn_10?.length) + Number(!!edition.covers?.some(id => id > 0));
	}

	private async optional<T>(fetch: () => Promise<T | null>): Promise<T | null>
	{
		try
		{
			return await fetch();
		}
		catch(error)
		{
			console.warn("Open Library supplementary metadata unavailable", error); return null;
		}
	}

	private normalizeKey(key: string): string
	{
		const match = key.match(/^(?:\/(?:works|books|authors)\/)?(OL\d+([WMA]))(?:\.json)?$/);

		if(!match)
		{
			throw new Error("Invalid Open Library identifier.");
		}

		const collection = match[2] === "W" ? "works" : match[2] === "M" ? "books" : "authors";

		return `/${collection}/${match[1]}`;
	}

	async request<T>(path: string, query: OpenLibraryQuery = {}): Promise<T | null>
	{
		const params = new URLSearchParams();

		for(const [name, value] of Object.entries(query))
		{
			if(value !== undefined && value !== null) params.set(name, String(value));
		}

		const url = `${OpenLibraryClient.BASE_URL}${path}${params.size ? `?${params.toString()}` : ""}`;
		const cached = this.cache.get(url);

		if(cached && cached.expires > Date.now())
		{
			return cached.value as T | null;
		}

		const existing = this.inFlight.get(url);

		if(existing)
		{
			return existing as Promise<T | null>;
		}

		const pending = this.queue.then(async () => {
			const wait = Math.max(0, this.nextRequestAt - Date.now());

			if(wait)
			{
				await new Promise<void>(resolve => window.setTimeout(resolve, wait));
			}

			this.nextRequestAt = Date.now() + this.requestIntervalMs;
			const headers: Record<string, string> = { Accept: "application/json" };

			if(this.API_KEY.trim())
			{
				headers["User-Agent"] = `Obsidian Chronicle (${this.API_KEY.trim()})`;
			}

			let response;

			try
			{
				response = await requestUrl({ url, method: "GET", headers, throw: false });
			}
			catch
			{
				throw new Error("Could not reach Open Library. Check your connection and try again.");
			}

			if(response.status !== 404 && (response.status < 200 || response.status >= 300))
			{
				throw new Error(`Open Library request failed (HTTP ${response.status}).`);
			}

			const value = response.status === 404 ? null : response.json as T;
			this.cache.set(url, { value, expires: Date.now() + 5 * 60 * 1000 });

			if(this.cache.size > 200)
			{
				const oldest = this.cache.keys().next();
				if(!oldest.done) this.cache.delete(oldest.value);
			}

			return value;
		});

		this.queue = pending.catch(() => undefined);
		const tracked = pending.finally(() => this.inFlight.delete(url));
		this.inFlight.set(url, tracked);

		return tracked;
	}
}
