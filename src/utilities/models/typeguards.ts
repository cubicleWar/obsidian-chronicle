import { PrimitiveValue, RecordLike } from "./types.js";

export function isMeaningfulValue(value: unknown): boolean
{
	return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

export function isRecordLike(value: unknown): value is RecordLike
{
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
}

function isPrimitive(value: unknown): value is PrimitiveValue
{
	return value === null || (typeof value !== "object" && typeof value !== "function");
}

export function isPrimitiveArray(values: unknown[]): values is PrimitiveValue[]
{
	return values.every(isPrimitive);
}

export function isObjectArray(values: unknown[]): values is RecordLike[]
{
	return values.every(
		(value) => value !== null && typeof value === "object" && !Array.isArray(value)
	);
}