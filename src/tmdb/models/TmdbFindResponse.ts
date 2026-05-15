export interface TmdbFindResponse
{
	movie_results?: Array<{ id: number }>;
	tv_results?: Array<{ id: number }>;
}