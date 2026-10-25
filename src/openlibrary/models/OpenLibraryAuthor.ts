import { OpenLibraryLink } from "./OpenLibraryLink.js";
import { OpenLibraryTextObject } from "./OpenLibraryTextObject.js";

export interface OpenLibraryAuthor
{
	key: string;
	name: string;
	alternate_names?: string[];
	birth_date?: string;
	death_date?: string;
	bio?: string | OpenLibraryTextObject;
	photos?: number[];
	personal_name?: string;
	fuller_name?: string;
	links?: OpenLibraryLink[];
	remote_ids?: Record<string, string>;
	source_records?: string[];
	latest_revision?: number;
	revision?: number;
}