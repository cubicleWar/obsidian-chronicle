import { OmdbEntry } from "./OmdbEntry";

export interface OmdbSeriesEpisode extends OmdbEntry
{
	Season: string;			// e.g. "1",
	Episode: string;			// e.g. "1",
	seriesID:  string;			// e.g.tt0306414",
}