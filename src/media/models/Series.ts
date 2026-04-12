import { SeriesSeasonSummary } from "./SeriesSeason";
import { ProductionStatus } from "./ProductionStatus";
import { ArtworkOwner } from "./ArtworkOwner";

export interface Series extends ArtworkOwner
{
	title: string;
	imdb_id: string | null;
	tmdb_id: number | null;
	miniseries: boolean;
	categories: string[],
	genres: string[];
	cast: string[];
	year: number | null;
	released: string | null;
	number_of_seasons: number;
	number_of_episodes: number | null;
	status: ProductionStatus;
	countries: string[];
	languages: string[];
	created_by: string[];
	overview: string | null;
	seasons: SeriesSeasonSummary[];
	rated: string | null;
	rating: number | null;
	networks: string[]
}