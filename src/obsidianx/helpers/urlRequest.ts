import { requestUrl } from "obsidian";

type queryParams = Record<string, string | number | null | undefined>;

export async function obsidianGetUrl<T>(
	base_url: string,
	headers: Record<string, string> = {},
	query: queryParams = {}
) : Promise<T | null>
{
	const searchParams = new URLSearchParams();

	Object.entries(query).forEach(([k, v]) => {
		if (v !== undefined && v !== null && v !== "")
		{
			searchParams.set(k, String(v));
		}
	});

	const query_str = searchParams.toString();
	const url = query ? `${base_url}?${query_str}` : base_url;

	const response = await requestUrl({
		url: url,
		method: "GET",
		headers: headers
	});

	if (response.status < 200 || response.status >= 300)
	{
		console.error(
			`GET ${base_url} failed with status ${response.status}: ${response.text}`
		);

		return null;
	}

	return response.json as T;
}