import { OmdbEntry } from "./OmdbEntry";

export interface OmdbMovie extends OmdbEntry
{
	BoxOffice: string;			// e.g. "$59,735,548"
	Production: string;			// e.g. "N/A",
	Website: string;				// e.g. "N/A"
}