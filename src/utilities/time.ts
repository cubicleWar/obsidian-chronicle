

// Extracts the year from a string
export function extractYear(value: unknown): string
{
	if (typeof value !== "string" || typeof value !== "number")
	{
		return "";
	}

	if (typeof value === "number" && Number.isFinite(value))
	{
		const n = Math.trunc(value);

		// Accept a wider historical range.
		if (n >= -9999 && n <= 9999 && n !== 0)
		{
			return formatHistoricalYear(n);
		}

		return "";
	}

	const text = String(value).trim();

	if (!text)
	{
		return "";
	}

	// Match patterns like:
	// 44 BC
	// 44 BCE
	// AD 70
	// CE 476
	// 476 CE
	// -44
	// 1066
	// c. 800 BC
	const eraMatch = text.match(
		/\b(?:(ad|ce)\s*)?(\d{1,4})(?:\s*(bc|bce|ad|ce))?\b/i
	);

	if (!eraMatch)
	{
		return "";
	}

	const prefixEra = eraMatch[1]?.toUpperCase();
	const yearText = eraMatch[2] ?? "";
	const suffixEra = eraMatch[3]?.toUpperCase();

	const year = Number.parseInt(yearText, 10);

	if (!Number.isFinite(year) || year === 0)
	{
		return "";
	}

	const era = suffixEra ?? prefixEra ?? "";

	if (era === "BC" || era === "BCE")
	{
		return formatHistoricalYear(-year);
	}

	return formatHistoricalYear(year);
}

function formatHistoricalYear(year: number): string
{
	const abs = Math.abs(year).toString().padStart(4, "0");
	return year < 0 ? `-${abs}` : abs;
}