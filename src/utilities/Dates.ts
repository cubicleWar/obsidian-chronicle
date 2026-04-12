

// Parses an iso date string of the form yyy-mm-dd and breaks it up into
// the year, month and day digits
function parseIsoDate(iso: string): [number, number, number]
{
	const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);

	if (!match)
	{
		throw new Error(`Invalid ISO date: ${iso}`);
	}

	const [, yStr, mStr, dStr] = match;

	const y = Number(yStr);
	const m = Number(mStr);
	const d = Number(dStr);

	return [y, m, d];
}

export function getCurrentIsoDate() : string
{
	let d = new Date()
	d.toISOString().split('T')[0]

	const offset = d.getTimezoneOffset()
	d = new Date(d.getTime() - (offset*60*1000))

	return <string>d.toISOString().split('T')[0]
}

// Formats an ISO date of the form yyy-mm-dd into a date string based on the options
export function formatDate(isoDate: string, locale: string = "en-GB", options? : any)
{
	if(!options)
	{
		options = {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		}
	}

	const formatter = new Intl.DateTimeFormat(locale, options);

	const [y, m, d] = parseIsoDate(isoDate);

	return formatter.format(new Date(Date.UTC(y, m - 1, d)));
}