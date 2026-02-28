import { assertNonNull } from "./guards/NonNull";


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

export function isValidNumber(value: any)
{
	return typeof value === 'number' && Number.isFinite(value);
}

export function safeArraySplit(s: string)
{
	if (!s || s === "N/A")
	{
		return [];
	}

	return String(s).split(",").map(x => x.trim()).filter(Boolean);
}

export function coalesce<T>(a: T | null | undefined, b: T | null | undefined): NonNullable<T>
{

	const result = a ?? b;

	assertNonNull(result);

	return result;
}

export function formatDate(isoDate: string)
{
	const formatter = new Intl.DateTimeFormat('en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});

	const [y, m, d] = isoDate.split('-').map(v => Number(v));

	return formatter.format(new Date(Date.UTC(y, m - 1, d)));
}

export function mergeUnique(a: any, b: any)
{
	const aIsArray = Array.isArray(a);
	const bIsArray = Array.isArray(b);

	if(aIsArray && bIsArray)
	{
		return [...new Set([...a, ...b])];
	}
	else if(aIsArray)
	{
		return a;
	}
	else if(bIsArray)
	{
		return b;
	}
	else
	{
		return [];
	}
}

export function getExtensionFromUrl(url: string) : string | null
{
	const pathname = new URL(url).pathname;
	const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
	const dotIndex = filename.lastIndexOf('.');

	return dotIndex !== -1 ? filename.substring(dotIndex + 1).toLowerCase() : null;
}