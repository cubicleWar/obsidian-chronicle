import { requestUrl, RequestUrlResponse } from "obsidian";
import { isGoogleBooksErrorResponse, GoogleBooksErrorResponse } from "./models/GoogleBooksErrorResponse.js";
import { GoogleBooksQuery } from "./models/GoogleBooksQuery.js";
import { GoogleBooksSearchResponse } from "./models/GoogleBooksSearchResponse.js";
import { GoogleBooksVolume } from "./models/GoogleBooksVolume.js";
import { canonicalIsbn } from "media/utilities/bookMatching.js";

export class GoogleBooksClient
{
	static readonly BASE_URL = "https://www.googleapis.com/books/v1";

	constructor(readonly API_KEY: string | null = null) {}

	async search(search_str: string, type: "books" | "magazines" | "all" = "books", maxResults: number = 10) : Promise<GoogleBooksVolume[]>
	{
		const title = search_str.trim();

		if(!title)
		{
			return [];
		}

		const resp = await this.request<GoogleBooksSearchResponse>("/volumes", {
			q: `intitle:${title}`,
			maxResults: maxResults,
			printType: type,
			projection: "full"
		});

		if(resp.items?.length)
		{
			return resp.items;
		}

		// Title-only searches can miss a title that general search can find.
		// Retry only a successful empty response, not a quota or network error.
		const fallback = await this.request<GoogleBooksSearchResponse>("/volumes", {
			q: title,
			maxResults: maxResults,
			printType: type,
			projection: "full"
		});
		return fallback.items ?? [];
	}

	async find(search_str: string) : Promise<GoogleBooksVolume | null>
	{
		const results = await this.search(search_str, "books", 1);
		const result = results[0];

		return result ?? null;
	}

	async getBook(id: string) : Promise<GoogleBooksVolume | null>
	{
		try
		{
			return await this.request<GoogleBooksVolume>(`/volumes/${id}`);
		}
		catch(error)
		{
			console.warn(error);
			return null;
		}
	}

	async findByIsbn(isbn: string): Promise<GoogleBooksVolume | null>
	{
		const canonical = canonicalIsbn(isbn);

		if(!canonical)
		{
			return null;
		}

		const response = await this.request<GoogleBooksSearchResponse>("/volumes", {
			q: `isbn:${canonical}`, printType: "books", maxResults: 10
		});
		const match = response.items?.find(volume => volume.volumeInfo.industryIdentifiers?.some(identifier =>
			(identifier.type === "ISBN_10" || identifier.type === "ISBN_13") && canonicalIsbn(identifier.identifier) === canonical
		));

		return match ? this.getBook(match.id) : null;
	}

	async request<T>(path: string, query: GoogleBooksQuery = {}) : Promise<T>
	{
		const query_params = {
			...query,
			key: this.API_KEY?.trim()
		};
		const params = new URLSearchParams();

		for(const [key, value] of Object.entries(query_params))
		{
			if(value !== undefined && value !== null && value !== "")
			{
				params.set(key, String(value));
			}
		}

		let response: RequestUrlResponse;

		try
		{
			response = await requestUrl({
				url: `${GoogleBooksClient.BASE_URL}${path}?${params.toString()}`,
				method: "GET",
				throw: false
			});
		}
		catch
		{
			// Do not expose the request URL, which can contain an API key.
			throw new Error("Could not reach Google Books. Check your connection and try again.");
		}

		if(response.status < 200 || response.status >= 300)
		{
			const hint = response.status === 429 ? " The request quota has been exceeded. Try again later." : "";
			throw new Error(`Google Books request failed (HTTP ${response.status}).${hint}`);
		}

		const data = response.json as T | GoogleBooksErrorResponse;

		if(isGoogleBooksErrorResponse(data))
		{
			throw new Error(`Google Books request failed (${data.error.code}).`);
		}

		return data;
	}
}
