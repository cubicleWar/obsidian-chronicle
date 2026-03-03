import { requestUrl } from "obsidian";

export async function downloadBinaryFile(url: string) : Promise<ArrayBuffer>
{
	// Download bytes
	const resp = await requestUrl({
		url: url,
		method: "GET",
		// Many servers dislike missing UA/accept; these headers are generally safe.
		headers: {
			Accept: "image/*,*/*;q=0.8",
		},
	});

	if (resp.status < 200 || resp.status >= 300)
	{
		throw new Error(`Failed to download image. HTTP ${resp.status}`);
	}

	return resp.arrayBuffer;
}
