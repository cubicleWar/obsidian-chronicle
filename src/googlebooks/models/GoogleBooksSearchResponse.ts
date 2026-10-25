import { GoogleBooksVolume } from "./GoogleBooksVolume.js";

export interface GoogleBooksSearchResponse
{
	kind: "books#volumes";
	totalItems: number;
	items?: GoogleBooksVolume[];
}
