import { isMeaningfulValue } from "utilities/models/typeguards.js";
import { RecordLike } from "utilities/models/types";

type CompletenessRule<T> = {
	weight?: number;
	required?: boolean;
	evaluate?: (value: T[keyof T], obj: T) => number;
};

type CompletenessSchema<T extends RecordLike> = {
	[K in keyof T]?: CompletenessRule<T>;
};

interface CompletenessResult<T>
{
	score: number;
	maxScore: number;
	percentage: number;
	missingRequired: (keyof T)[];
	presentFields: (keyof T)[];
	missingFields: (keyof T)[];
}

//
// A fallback function for scoring the presence and content
// of a variable
//
function defaultFieldScore(value: unknown): number
{
	if (!isMeaningfulValue(value))
	{
		return 0;
	}

	if (Array.isArray(value))
	{
		return value.length > 0 ? 1 : 0;
	}

	if (typeof value === "string")
	{
		return value.trim().length > 0 ? 1 : 0;
	}

	if (typeof value === "number")
	{
		return Number.isFinite(value) ? 1 : 0;
	}

	if (typeof value === "boolean")
	{
		return 1;
	}

	if (typeof value === "object")
	{
		return Object.keys(value as object).length > 0 ? 1 : 0;
	}

	return 0;
}

export function evaluateCompleteness<T extends RecordLike>(obj: T, schema: CompletenessSchema<T>): CompletenessResult<T>
{
	let score = 0;
	let maxScore = 0;

	const missingRequired: (keyof T)[] = [];
	const presentFields: (keyof T)[] = [];
	const missingFields: (keyof T)[] = [];

	for (const key of Object.keys(schema) as (keyof T)[])
	{
		const rule = schema[key] ?? {};
		const weight = rule.weight ?? 1;
		const value = obj[key];

		maxScore += weight;

		const rawFieldScore = rule.evaluate
			? rule.evaluate(value, obj)
			: defaultFieldScore(value);

		const normalizedFieldScore = rawFieldScore > 0 ? 1 : 0;
		score += normalizedFieldScore * weight;

		if (normalizedFieldScore > 0)
		{
			presentFields.push(key);
		}
		else
		{
			missingFields.push(key);

			if (rule.required)
			{
				missingRequired.push(key);
			}
		}
	}

	return {
		score,
		maxScore,
		percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
		missingRequired,
		presentFields,
		missingFields,
	};
}