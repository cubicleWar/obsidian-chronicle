// Returns the runtime statistics for an array of objects with a runtime parameter
type RuntimeStats = {average_runtime: number, total_runtime: number};

export function runtimeStatistics<T extends { runtime?: unknown }>(items: T[]): RuntimeStats;
export function runtimeStatistics<T extends object, K extends keyof T & string>(items: T[], parameter: K): RuntimeStats;
export function runtimeStatistics(items: object[], parameter: string = "runtime") : RuntimeStats
{
	let total_runtime = 0,
		included_episode_count = 0;

	for(let i = 0, len = items.length; i < len; i++)
	{
		const e = items[i];

		if(!e) continue;

		const runtime = (e as Record<string, unknown>)[parameter];

		if(typeof runtime === "number" && Number.isFinite(runtime))
		{
			total_runtime += runtime;
			included_episode_count++;
		}
	}

	const average_runtime = included_episode_count > 0
		? Math.round(100 * total_runtime / included_episode_count) / 100
		: 0;
	const estimated_total_runtime = Math.round(100 * items.length * average_runtime) / 100;

	return {
		average_runtime: average_runtime,
		total_runtime: estimated_total_runtime
	}
}
