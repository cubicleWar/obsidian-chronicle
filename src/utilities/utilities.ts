export function toIntOrNull(x: unknown) : number | null
{
	return toIntOrY(x, null);
}

export function toIntOrY<T>(x: unknown, y: T) : number | T
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
	if(typeof value === 'string')
	{
		return String(value)
			.trim()
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^\p{L}\p{N}]+/gu, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	return "";
}

//
// Returns the first usable normalized value from the provided fields.
//
export function firstMatchingValue<T extends object>(obj: T, fields: Array<keyof T>, transform: (value: unknown) => string = normalizeText): string
{
	for (const field of fields)
	{
		if (!(field in obj)) continue;

		const value = transform(obj[field]);

		if (value) return value;
	}

	return "";
}