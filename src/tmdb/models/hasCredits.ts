import { TmdbActor } from "./TmdbActor.js"
import { TmdbCrew } from "./TmdbCrew.js"

export interface hasCredits
{
	credits?: {
		cast: TmdbActor[],
		crew: TmdbCrew[]
	}
}