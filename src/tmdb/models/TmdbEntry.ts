
import { TmdbGenre } from "./TmdbGenre.js";
import { TmdbLanguage } from "./TmdbLanguage.js";
import { TmdbCompany } from "./TmdbCompany.js"
import { TmdbCountry } from "./TmdbCountry.js";

export interface TmdbEntry
{
	id: number;
	adult: boolean;
	backdrop_path: string | null;
	genres: TmdbGenre[];
	homepage: string | null;
	original_language: string;
	overview: string;
	popularity: number;
	poster_path: string | null;
	production_companies: TmdbCompany[];
	production_countries: TmdbCountry[];
	spoken_languages: TmdbLanguage[];
	status: string; // e.g. "Released"
	tagline: string | null;
	vote_average: number;
	vote_count: number;
}