import { PrimitiveValue, JsonPrimitive, RecordLike } from "./types.js";

export function isMeaningfulValue(value: any): boolean
{
	return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

export function isPlainObject(value: any): value is Record<string, any>
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isPrimitive(value: unknown): value is PrimitiveValue
{
	return value === null || (typeof value !== "object" && typeof value !== "function");
}

export function isJsonPrimitive(value: unknown): value is JsonPrimitive
{
	return (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	);
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