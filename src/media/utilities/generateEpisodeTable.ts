import { SeriesEpisode } from "media/models/SeriesEpisode";
import { formatDate } from "utilities/Dates.js";
import { markdownTable } from "markdown-table";

export function generateEpisodeTable(episodes: SeriesEpisode[])
{
	let content = "";
	let table =[
		["Episode", "Title", "Runtime", "Released", "Plot"]
	]
	const table_options = {
		align: ["c", "l", "c", "c", "l"]
	};

	if(Array.isArray(episodes) && episodes.length > 0)
	{
		for(const episode of episodes)
		{
			const released = episode.released ? formatDate(episode.released) : "";
			const plot = episode.overview.replace(/[\r\n]+/g, ' ');

			table.push([String(episode.episode_number), episode.title, String(episode.runtime), released, plot])
		}

		content = markdownTable(table, table_options);

	}

	return content;
}