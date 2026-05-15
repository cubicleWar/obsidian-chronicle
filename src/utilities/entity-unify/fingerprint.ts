import { normalizeText, firstMatchingValue } from '../utilities.js';

export type FingerprintFn<T extends object> = (obj: T, path: string[]) => ObjectSignature;
type KeySpecResolver<T extends object> = (obj: T, path: string[]) => KeySpec<T>[];

interface KeyPartSpec<T extends object>
{
	fields: Array<keyof T>;						// The fields to look for sequentially to provide a value for the key generation
	transform?: (value: unknown) => string;		// A function to normalise the field value
	label?: string;								// A label to use in place of the field name to alias fields e.g. original_title => title
	required?: boolean;							// Whether this spec is mandatory in developing a key
}

export interface KeySpec<T extends object>
{
	group: "strong" | "semantic" | "weak" | "nestedStrong";
	prefix: string;								// The prefix to use for the key e.g. semantic
	mode?: "combined" | "per-field";			// Whether to generate a key per field (recommended for strong keys) or compound keys
	parts: KeyPartSpec<T>[];							// Specifications on how to build each comparison key
	separator?: string;							// The string used to separate fields
	includeLabels?: boolean;					// Prefix values with the labels or their field names
	allowPartial?: boolean;						// Allows a key can be generated even if some required parts are missing
}

export interface ObjectSignature
{
	primaryKey: string;
	keyGroups: Record<string, string[]>;
	allKeys: string[];
	completenessScore?: number;
}

interface SignatureMatch
{
	isMatch: boolean;
	matchStrength: "strong" | "semantic" | "weak" | "none";
	matchingKeys: string[];
}


//
// Generates one or more normalized comparison keys for an object based on a set
// of key specifications. These keys can then be used for matching, grouping,
// or deduplicating objects that may not be exactly identical but represent the
// same underlying entity.
//
// Supports two modes:
// - "per-field": creates a separate key for each populated field
// - "combined": creates a single key by combining multiple normalized parts
//
// Common uses:
// - strong keys: IDs such as imdb_id, tmdb_id, isbn
// - semantic keys: combinations such as type + title + year
// - weak keys: lower-confidence combinations such as title + author + publisher
//
// Given:
//	const obj = {
//		imdb_id: "tt1160419",
//		title: "Dune",
//		type: "movie",
//		release_date: "2021-09-03",
//		author: "Frank Herbert"
//	};
//
// And specs:
//	const specs: KeySpec[] = [
//		{
//			prefix: "id",
//			mode: "per-field",
//			parts: [{ fields: ["imdb_id", "tmdb_id"] }],
//		},
//		{
//			prefix: "semantic",
//			parts: [
//				{ fields: ["type", "media_type"], required: true },
//				{ fields: ["title", "name"], required: true },
//				{ fields: ["year", "release_date"], transform: extractYear, required: true },
//			],
//		}
//	]
//
// Would output:
//	[
//		"id:imdb_id:tt1160419",
//		"semantic:movie|dune|2021",
//	]
//
// Notes:
// - values are normalized before being added to keys
// - missing required parts prevent a combined key from being generated
// - duplicate keys are removed
//
function generateKeys<T extends object>(obj: T, specs: KeySpec<T>[]): Record<string, string[]>
{
	const grouped = new Map<string, Set<string>>();

	for (const spec of specs)
	{
		const mode = spec.mode ?? "combined";
		const separator = spec.separator ?? "|";
		const includeLabels = spec.includeLabels ?? false;
		const allowPartial = spec.allowPartial ?? false;

		if (!grouped.has(spec.group))
		{
			grouped.set(spec.group, new Set<string>());
		}

		const bucket = grouped.get(spec.group);
		if (!bucket) continue;

		if (mode === "per-field")
		{
			for (const part of spec.parts)
			{
				const transform = part.transform ?? normalizeText;

				for (const field of part.fields)
				{
					if (!(field in obj)) continue;

					const value = transform(obj[field]);
					if (!value) continue;

					const label = includeLabels && part.label ? part.label : String(field)
					const piece = `${label}:${value}`;

					bucket.add(`${spec.prefix}:${piece}`);
				}
			}

			continue;
		}

		const values: string[] = [];
		let failedRequired = false;

		for (const part of spec.parts)
		{
			const transform = part.transform ?? normalizeText;
			const value = firstMatchingValue(obj, part.fields, transform);

			if (!value)
			{
				if (part.required && !allowPartial)
				{
					failedRequired = true;
					break;
				}
				continue;
			}

			values.push(
				includeLabels && part.label
					? `${part.label}:${value}`
					: value
			);
		}

		if (!failedRequired && values.length > 0)
		{
			bucket.add(`${spec.prefix}:${values.join(separator)}`);
		}
	}

	return Object.fromEntries(
		[...grouped.entries()].map(([group, keys]) => [group, [...keys]])
	);
}

export function compareSignatures(a: ObjectSignature, b: ObjectSignature): SignatureMatch
{
	const GROUP_PRIORITY = ["strong", "semantic", "weak"] as const;

	for (const group of GROUP_PRIORITY)
	{
		const aKeys = a.keyGroups[group] ?? [];
		const bKeys = b.keyGroups[group] ?? [];

		const matchingKeys = aKeys.filter((key) => bKeys.includes(key));

		if (matchingKeys.length > 0)
		{
			return {
				isMatch: true,
				matchStrength: group,
				matchingKeys,
			};
		}
	}

	return {
		isMatch: false,
		matchStrength: "none",
		matchingKeys: [],
	};
}

function createObjectSignature<T extends object>(obj: T, path: string[], resolveKeySpecs: KeySpecResolver<T>): ObjectSignature
{
	const specs = resolveKeySpecs(obj, path);
	const keyGroups = generateKeys(obj, specs);

	const allKeys = [...new Set(Object.values(keyGroups).flat())];

	const primaryKey =
		keyGroups.strong?.[0] ??
		keyGroups.nestedStrong?.[0] ??
		keyGroups.semantic?.[0] ??
		keyGroups.weak?.[0] ??
		"unknown";

	return {
		primaryKey,
		keyGroups,
		allKeys
	};
}

export function makeFingerprint<T extends object>(resolveKeySpecs: KeySpecResolver<T>): FingerprintFn<T>
{
	return (obj, path) => createObjectSignature(obj, path, resolveKeySpecs);
}
