import { KeySpec } from "utilities/entity-unify/fingerprint.js";
import { RecordLike } from "utilities/models/types.js";
import { extractYear } from "utilities/time.js";


export function resolveFingerprintSpecs(obj: RecordLike, path: string[]): KeySpec<RecordLike>[]
{
	const pathKey = path.join(".");

	// Top-level media objects
	if (pathKey === "")
	{
		return [
			{
				group: "strong",
				prefix: "id",
				mode: "per-field",
				parts: [
					{ fields: ["id", "imdb_id", "tmdb_id", "tvdb_id"] },
				],
			},
			{
				group: "semantic",
				prefix: "semantic",
				parts: [
					{
						fields: ['title'],
						required: true
					},
					{
						fields: ['year', 'released', 'air_date'],
						transform: extractYear,
						label: 'year',
						required: true
					}
				],
			},
		];
	}

	// Seasons inside a TV series
	if (pathKey === "seasons")
	{
		return [
			// Treat title as effectively strong for this nested type
			{
				group: "strong",
				prefix: "id",
				mode: "per-field",
				parts: [
					{ fields: ["title"], label: "title" },
					{ fields: ["season_number"], label: "season_number" },
				],
				includeLabels: true,
			},
			{
				group: "semantic",
				prefix: "semantic",
				parts: [
					{ fields: ["title", "name"], required: true },
					{ fields: ["season_number"], required: true },
				],
			},
		];
	}

	// Episodes inside seasons
	if (pathKey === "seasons.episodes")
	{
		return [
			{
				group: "semantic",
				prefix: "semantic",
				parts: [
					{ fields: ["episode_number"], required: true },
					{ fields: ["title", "name"], required: true },
				],
			},
			{
				group: "weak",
				prefix: "weak",
				includeLabels: true,
				parts: [
					{ fields: ["title", "name"], label: "title", required: true },
					{ fields: ["air_date"], label: "year", transform: extractYear },
				],
			},
		];
	}

	// Fallback
	return [
		{
			group: "semantic",
			prefix: "semantic",
			parts: [
				{ fields: ["title", "name", "label"], required: true },
			],
		},
	];
}
