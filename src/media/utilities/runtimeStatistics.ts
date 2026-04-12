// Returns the runtime statistics for an array of objects with a runtime parameter
export function runtimeStatistics(items: any[], parameter: string = "runtime") : {average_runtime: number, total_runtime: number}
{
	let total_runtime = 0,
	included_epsiode_count = 0;

	for(let i = 0, len = items.length; i < len; i++)
	{
		const e = items[i];

		if(e?.[parameter])
		{
			total_runtime += e[parameter];
			included_epsiode_count++;
		}
	}

	const average_runtime = Math.round(100 * total_runtime / included_epsiode_count) / 100;
	total_runtime = items.length * average_runtime

	return {
		average_runtime: average_runtime,
		total_runtime: total_runtime
	}
}