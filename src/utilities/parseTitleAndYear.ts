// Parses titles and years for title strings when format is like "Die Hard (1998)"
// Todo: also parse "Die Hard 1998"
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