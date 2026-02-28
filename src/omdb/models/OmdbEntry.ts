import { OmdbRating } from "./OmdbRating";

export interface OmdbEntry
{
	"Title": string;				// e.g. "Predator"
	"Year": string;					// e.g. "1987"
	"Rated": string;				// e.g. "R"
	"Released": string;				// e.g. "12 Jun 1987"
	"Runtime": string;				// e.g. "107 min"
	"Genre": string;				// e.g. "Action, Adventure, Horror"
	"Director": string;				// e.g. "John McTiernan"
	"Writer": string;				// e.g. "Jim Thomas, John Thomas"
	"Actors": string;				// e.g. "Arnold Schwarzenegger, Carl Weathers, Kevin Peter Hall"
	"Plot": string;					// e.g. "A team of commandos on a mission in a Central American jungle find themselves hunted by an extraterrestrial warrior."
	"Language": string;				// e.g. "English, Spanish, Russian"
	"Country": string;				// e.g. "United States, Mexico"
	"Awards": string;				// e.g. "Nominated for 1 Oscar. 3 wins & 6 nominations total"
	"Poster":string;				// e.g. "https://m.media-amazon.com/images/M/MV5BOWEzMDI0MTUtMjQ0Yy00MGRhLWI4YjAtZTgzZTM3NTYxZGJkXkEyXkFqcGc@._V1_SX300.jpg"
	"Ratings": OmdbRating[];
	"Metascore": string;			// e.g. "47"
	"imdbRating": string;			// e.g. "7.8"
	"imdbVotes": string;			// e.g. "494,204"
	"imdbID": string;				// e.g. "tt0093773"
	"Type": "series" | "movie";		// e.g. "movie"
	"Response": "True" | "False";
}