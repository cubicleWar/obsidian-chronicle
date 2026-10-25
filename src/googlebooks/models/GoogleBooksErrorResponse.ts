import { isRecordLike } from "utilities/models/typeguards.js";

export interface GoogleBooksErrorResponse
{
	error: {
		code: number;
		message: string;
		errors?: Array<{
			message: string;
			domain: string;
			reason: string;
		}>;
	};
}

export function isGoogleBooksErrorResponse(obj: unknown): obj is GoogleBooksErrorResponse
{
	if(!isRecordLike(obj))
	{
		return false;
	}

	return "error" in obj;
}
