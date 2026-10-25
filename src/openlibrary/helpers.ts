import { OpenLibraryTextObject } from "openlibrary/models/OpenLibraryTextObject.js";

export function getOlibTextReference(value: unknown): string | null
{
	return typeof value === "string" ? value : (value as OpenLibraryTextObject)?.value ?? null;
}