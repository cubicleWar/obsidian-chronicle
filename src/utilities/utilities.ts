import { RecordLike } from "./models/types.js";

/** -----------------------
 *  Small utilities
 *  ----------------------*/

export function toIntOrNull(x: any)
{
	return toIntOrY(x, null);
}

export function toIntOrY(x: any, y: any)
{
	const n = Number(x);
	return Number.isFinite(n) ? n : y;
}

export function safeArraySplit(s: string)
{
	if (!s || s === "N/A")
	{
		return [];
	}

	return String(s).split(",").map(x => x.trim()).filter(Boolean);
}

//
// Normalizes strings for direct comparison
// e.g. normalizeTest("Crème Brûlée") => "Creme Brulee"
//
export function normalizeText(value: unknown): string
{
	if (value == null)
	{
		return "";
	}

	return String(value)
		.trim()
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

// Returns the first field from an array of field names that is present in an object and
// has a valid value
export function firstNonEmpty(obj: Record<string, unknown>, fields: string[], transform?: (v: unknown) => string): string
{
	for (const field of fields)
	{
		if (!(field in obj))
		{
			continue;
		}

		const raw = obj[field];
		const value = transform ? transform(raw) : normalizeText(raw);

		if (value)
		{
			return value;
		}
	}

	return "";
}


//
// Returns the first usable normalized value from the provided fields.
//
export function firstMatchingValue(obj: RecordLike, fields: string[], transform: (value: unknown) => string = normalizeText): string
{
	for (const field of fields)
	{
		if (!(field in obj)) continue;

		const value = transform(obj[field]);

		if (value) return value;
	}

	return "";
}