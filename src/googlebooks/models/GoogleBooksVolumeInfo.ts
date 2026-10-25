import { GoogleBooksImageLinks } from "./GoogleBooksImageLinks.js";
import { GoogleBooksIndustryIdentifier } from "./GoogleBooksIndustryIdentifier.js";

export interface GoogleBooksVolumeInfo
{
	title: string;
	subtitle?: string;
	authors?: string[];
	publisher?: string;
	publishedDate?: string;
	description?: string;
	industryIdentifiers?: GoogleBooksIndustryIdentifier[];
	pageCount?: number;
	printType?: "BOOK" | "MAGAZINE";
	categories?: string[];
	averageRating?: number;
	ratingsCount?: number;
	language?: string;
	imageLinks?: GoogleBooksImageLinks;
	previewLink?: string;
	infoLink?: string;
	canonicalVolumeLink?: string;
}
