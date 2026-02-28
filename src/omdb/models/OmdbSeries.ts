import { OmdbEntry } from "./OmdbEntry";

export interface OmdbSeries extends OmdbEntry
{
	"totalSeasons": string;			// e.g. "5"
	"miniseries": boolean;
}