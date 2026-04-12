import { unique } from 'radash'

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


// Merging functions

type AnyObject = Record<string, any>;


// Merge two models e.g. movie data sourced from two different API's
// Model 'a' is preferred over model
export function mergeModelData<T>(...models: T[]): T
{
	if(mergeObjects.length === 0)
	{
		throw new Error("mergeModelData requires at least one argument");
	}

	return models.reduce((acc, obj) => mergeInternal(acc, obj)) as T;
}

function mergeInternal(a: any, b: any): any
{
	// If A is valid, use it unless we need to recurse
	if (isValid(a))
	{
		// Objects → deep merge
		if (isPlainObject(a) && isPlainObject(b))
		{
			return mergeObjects(a, b);
		}

		// Arrays → combine and dedupe
		if (Array.isArray(a) && Array.isArray(b))
		{
			const combined = [...(a ?? []), ...(b ?? [])];

			return unique(combined,(i: any) => getDedupKey(i));
		}

		// Primitive → A wins
		return a;
	}

	// A invalid → use B (even if B invalid, consistent fallback)
	return b;
}

function mergeObjects(a: AnyObject, b: AnyObject): AnyObject
{
	const result: AnyObject = {};

	const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);

	for (const key of keys)
	{
		result[key] = mergeInternal(a?.[key], b?.[key]);
	}

	return result;
}

function isValid(value: any): boolean
{
	return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

function isPlainObject(value: any): value is Record<string, any>
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getDedupKey(value: any): string
{
	// Primitives
	if (value === null || typeof value !== "object")
	{
		return `primitive:${String(value)}`;
	}

	// Fallback: deep stringify (stable-ish)
	return `obj:${stableStringify(value)}`;
}

function stableStringify(obj: any): string
{
	if (obj === null || typeof obj !== "object")
	{
		return JSON.stringify(obj);
	}

	if (Array.isArray(obj))
	{
		return `[${obj.map(stableStringify).join(",")}]`;
	}

	const keys = Object.keys(obj).sort();

	return `{${keys
		.map(k => `"${k}":${stableStringify(obj[k])}`)
		.join(",")}}`;
}