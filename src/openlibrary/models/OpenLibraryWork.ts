import { OpenLibraryTextObject } from "./OpenLibraryTextObject.js";
import { OpenLibraryReference } from "./OpenLibraryReference.js";

interface OpenLibraryWorkAuthor
{
	author: OpenLibraryReference
	type?: OpenLibraryReference
}

export interface OpenLibraryWork
{
	key: string;
	title: string;
	authors?: OpenLibraryWorkAuthor[];
	description?: string | OpenLibraryTextObject;
	subjects?: string[];
	subject_people?: string[];
	subject_places?: string[];
	subject_times?: string[];
	covers?: number[];
	first_publish_date?: string;
	latest_revision?: number;
	revision?: number;
	created?: OpenLibraryTextObject;
	last_modified?: OpenLibraryTextObject;
};
