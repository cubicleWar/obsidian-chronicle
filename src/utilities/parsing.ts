

export function slugifyFilename(filename: string, spacer: string = " ") : string
{
	// Obsidian is fine with many characters, but keep filenames safe across OSes.
	return filename
			.trim()
			.replace(/[\/\\:*?"<>|]/g, "")		// Windows-illegal
			.replace(/\s+/g, spacer)
			.replace(/\.$/, "") 				// no trailing dot on Windows
			.slice(0, 180);
}

// Parses titles and years for title strings when format is like "Die Hard (1998)"
export function parseTitleAndYear(rawTitle: string) : {title: string, year: (number | null)}
{
	const s = String(rawTitle).trim();

	let val : { title : string, year: (number | null) } = {
		title: s,
		year: null
	};

	// Match "Title (1999)" at end of string
	const m = s.match(/^(.*?)(?:\s*\(?((?:18|19|20)\d{2})\)?)$/);

	if (m)
	{
		val.title = m[1] ? m[1].trim() : '';
		val.year = Number(m[2]);
	}
	else
	{
		val.title = s;
	}

	return val;
}

//
// Date and Time processing functions
//



export function normalizeDateToYYYYMMDD(raw: string) : (string | null)
{

	if (!raw)
	{
		return null;
	}

	const s = String(raw).trim();

	// If already YYYY-MM-DD, accept.
	if (/^\d{4}-\d{2}-\d{2}$/.test(s))
	{
		return s;
	}

	// First  AU/UK style: dd/mm/yy or dd-mm-yy
	const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

	if (m)
	{
		const day = Number(m[1]);
		const month = Number(m[2]);
		const year = Number(m[3]);

		// Range checks
		if (month < 1 || month > 12) return null;
		if (day < 1 || day > 31) return null;

		// Calendar validation (catches 31/02/2024, etc.)
		const d = new Date(Date.UTC(year, month - 1, day));
		if (
			d.getUTCFullYear() !== year ||
			d.getUTCMonth() !== month - 1 ||
			d.getUTCDate() !== day
		) {
			return null;
		}

		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	}



	// Try Date parsing (handles many formats, but is locale-sensitive for dd/mm vs mm/dd)
	const d = new Date(s);

	if (!Number.isNaN(d.getTime()))
	{
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const dd = String(d.getDate()).padStart(2, "0");
		return `${yyyy}-${mm}-${dd}`;
	}

	return null;
}

export function normalizeTimeToMinutes(runLengthRaw: string) : (number | null)
{
	if (runLengthRaw == null)
	{
		return null;
	}

	const s = String(runLengthRaw).trim();

	// If already a plain number, assume minutes.
	if (/^\d+$/.test(s))
	{
		return Number(s);
	}

	// If "hh:mm"
	const hm = s.match(/^(\d{1,2}):(\d{2})$/);

	if (hm)
	{
		return Number(hm[1]) * 60 + Number(hm[2]);
	}

	// If "2h 10m", "2h", "130m"
	const h = s.match(/(\d+)\s*h/i);
	const m = s.match(/(\d+)\s*m/i);
	if (h || m)
	{
		return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
	}

	return null; // fallback: preserve as string if unknown
}

export function mergeUniqueSortedDates(existingDates: string[], incomingDates: string[]) : string[]
{
	const set = new Set<string>();

	for (const d of existingDates || [])
	{
		if (d) set.add(d);
	}

	for (const d of incomingDates || [])
	{
		if (d) set.add(d);
	}

	return Array.from(set).sort();
}