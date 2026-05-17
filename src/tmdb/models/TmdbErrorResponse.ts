import { isRecordLike } from "utilities/models/typeguards.js";

export type TmdbErrorResponse = {
	success: boolean;
	status_code: number;
	status_message: string;
}

export function isTmdbErrorResponse(value: unknown): value is TmdbErrorResponse
{
	if(!isRecordLike(value)) return false;

	return (
		value.success === false &&
		typeof value.status_code === "number" &&
		typeof value.status_message === "string"
	);
}