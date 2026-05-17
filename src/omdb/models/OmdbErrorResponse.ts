import { isRecordLike } from "utilities/models/typeguards.js";

export type OmdbErrorResponse = {
	Response: string;
	Error: string;
}

export function isOmdbErrorResponse(value: unknown): value is OmdbErrorResponse
{
	if(!isRecordLike(value)) return false;

	return (
		value.Response === "False" &&
		typeof value.Error === "string"
	);
}