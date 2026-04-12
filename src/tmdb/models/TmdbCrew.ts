import { TmdbPerson } from "./TmdbPerson";

export interface TmdbCrew extends TmdbPerson
{
	department: string,
	job: string,
	adult: false,
	known_for_department: string,
	popularity: number,
}
