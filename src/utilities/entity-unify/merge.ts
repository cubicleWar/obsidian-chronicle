import { PrimitiveValue, RecordLike } from "utilities/models/types.js";
import { isMeaningfulValue, isRecordLike, isPrimitiveArray, isObjectArray } from "utilities/models/typeguards.js";
import { ObjectSignature, compareSignatures, FingerprintFn } from "./fingerprint.js";


//
// Merges multiple objects from left to right using the existing pairwise merge logic.
// Earlier objects have precedence where the merge rules prefer the left-hand value.
//
// Example:
// mergeObjects([a, b, c], fingerprint)
// is equivalent to:
// mergeObjectsPair(mergeObjectsPair(a, b, fingerprint), c, fingerprint)
//
export function mergeObjects<T extends object>(
	items: T[],
	fingerprint: FingerprintFn<RecordLike>,
	getCompletenessScore?: (item: T) => number
): T | null {
	if (items.length === 0)
	{
		return null;
	}

	let ranked = items;

	if(typeof getCompletenessScore === "function")
	{
		ranked = [...items].sort(
			(a, b) => getCompletenessScore(b) - getCompletenessScore(a)
		);
	}

	let result = ranked[0];

	if (!result)
	{
		return null;
	}

	for (let i = 1; i < ranked.length; i++)
	{
		const current = ranked[i];
		if (!current) continue;

		result = mergeObjectPair(result, current, fingerprint);
	}

	return result;
}

function mergeObjectPair<T extends object>(
	a: T,
	b: Partial<T>,
	fingerprint: FingerprintFn<RecordLike>,
	path: string[] = []
): T
{
	const result: RecordLike = { ...(a as RecordLike) };
	const keys = new Set([
		...Object.keys(a),
		...Object.keys(b)
	]);

	for (const key of keys)
	{
		const left = result[key];
		const right = (b as RecordLike)[key];
		const nextPath = [...path, key];

		if (Array.isArray(left) && Array.isArray(right))
		{
			const leftArray: unknown[] = left;
			const rightArray: unknown[] = right;

			if (isObjectArray(leftArray) && isObjectArray(rightArray))
			{
				result[key] = uniqueObjectsBySignature([...leftArray, ...rightArray], fingerprint, nextPath);
			}
			else if (isPrimitiveArray(leftArray) && isPrimitiveArray(rightArray))
			{
				result[key] = uniquePrimitives([...leftArray, ...rightArray]);
			}
			else
			{
				// Mismatched array types - return the combination
				result[key] = [...leftArray, ...rightArray];
			}
		}
		else if(isRecordLike(left) && isRecordLike(right))
		{
			result[key] = mergeObjectPair(left, right, fingerprint, nextPath);
		}
		else
		{
			result[key] = mergePrimitive(left, right);
		}
	}

	return result as T;
}

function uniqueObjectsBySignature<T extends RecordLike>(
	items: T[],
	fingerprint: FingerprintFn<RecordLike>,
	path: string[]
): T[] {
	const merged: Array<{ item: T; signature: ObjectSignature }> = [];

	for (const item of items)
	{
		const signature = fingerprint(item, path);

		const existingIndex = merged.findIndex(({ signature: existing }) =>
			compareSignatures(existing, signature).isMatch
		);

		if (existingIndex === -1)
		{
			merged.push({ item, signature });
			continue;
		}

		const existingEntry = merged[existingIndex];

		if (!existingEntry) continue;

		const mergedItem = mergeObjectPair(existingEntry.item, item, fingerprint, path);

		merged[existingIndex] = {
			item: mergedItem,
			signature: fingerprint(mergedItem, path),
		};
	}

	return merged.map((entry) => entry.item);
}

function uniquePrimitives<T extends PrimitiveValue>(values: T[]): T[]
{
	return [...new Set(values.filter(isMeaningfulValue))];
}

// Returns the best value, biasing a over b
function mergePrimitive(a: unknown, b: unknown) : unknown
{
	if(isMeaningfulValue(a))
	{
		return a;
	}
	else if(isMeaningfulValue(b))
	{
		return b;
	}

	return null;
}
