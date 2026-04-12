import { ArtworkOwner } from "./ArtworkOwner";


export interface Movie extends ArtworkOwner
{
	title: string;
	categories: string[];
	genres: string[];
	director: string | null;
	cast: string[];
	writers: string[];
	runtime: number | null;
	rating: number | null;
	year: number | null;
	imdb_id: string | null;
	tmdb_id: number | null;
	rated: string | null;
	released: string | null;
	languages: string[];
	countries: string[];
	box_office: string | null;
	overview: string | null;
}