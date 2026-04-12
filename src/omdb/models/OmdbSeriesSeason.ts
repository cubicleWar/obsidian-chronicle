import { OmdbSeriesEpsiodeInfo } from "./OmdbSeriesEpsiodeInfo.js";
import { OmdbSeriesEpisode } from "./OmdbSeriesEpisode.js";

export interface OmdbSeriesSeason
{
	Title: string;					// e.g. "The Wire",
	Season: string;					// e.g. "1",
	totalSeasons: string;			// e.g. "5",
	Episodes: OmdbSeriesEpsiodeInfo[] | OmdbSeriesEpisode[];
	Response: "True" | "False";
}