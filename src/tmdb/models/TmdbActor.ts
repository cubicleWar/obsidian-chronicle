import { TmdbCrew } from "./TmdbCrew";

export interface TmdbActor extends TmdbCrew
{
	character: string;
	order: number;
}