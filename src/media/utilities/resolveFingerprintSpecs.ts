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

	// A season is also merged directly, so its episodes can be at the root.
	// Titles are not identities: different episodes can share the same title.
	if (pathKey === "episodes" || pathKey === "seasons.episodes")
	{
		const episodeNumber = (value: unknown): string =>
			typeof value === "number" && Number.isInteger(value) && value >= 0 ? String(value) : "";
		const providerId = (value: unknown): string =>
			typeof value === "string" ? value.trim() : typeof value === "number" && value > 0 ? String(value) : "";
		return [
			{
				group: "strong",
				prefix: "episode-id",
				mode: "per-field",
				parts: [
					{ fields: ["imdb_id", "tmdb_id"], transform: providerId },
				],
			},
			{
				group: "semantic",
				prefix: "episode-position",
				parts: [
					{ fields: ["season_number"], transform: episodeNumber, required: true },
					{ fields: ["episode_number"], transform: episodeNumber, required: true },
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
