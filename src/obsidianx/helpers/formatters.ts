// Include wiki-link delimiters as well as characters forbidden by file systems.
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|#^[\]]/g;

// JSON values are valid YAML flow values and preserve list item boundaries.
export function toYamlValue(value: unknown): string
{
	return JSON.stringify(value) ?? "null";
}

// Takes a comma delimited string or an array of strings and converts
// to a markdown list
export function toMarkdownlist(value: string | string[]) : string
{
	let list = ``;

	if(typeof value === 'string')
	{
		value = value.split(',').map(item => item.trim());
	}

	if(Array.isArray(value))
	{
		for(let i = 0, len = value.length; i < len; i++)
		{
			list += `\n  - ${toYamlSafeString(value[i] ?? "")}`
		}

		return list;
	}
	else
	{
		return value;
	}
}

export function toBacklink(value: string, mode: "fm" | "embed" | "body" = "fm") : string
{
	if(!value?.trim())
	{
		return "";
	}

	let result = `[[${value}]]`

	if(mode === "body")
	{
		return result;
	}
	else if(mode === "embed")
	{
		return "!" + result;
	}
	else
	{
		// Return the default "fm" mode
		return toYamlSafeString(result);
	}
}

export function slugifyFilename(filename: string, spacer: string = " ") : string
{
	// Keep generated names safe across OSes and inside Obsidian wiki-links.
	const safe_filename = filename
			.trim()
			.replace(INVALID_FILENAME_CHARS, "")
			.replace(/\s+/g, " ")
			.replace(/-+/g, "-")
			.replace(/^\.+/, "")
			.replace(/[. ]+$/, "")		// no trailing dot on Windows
			.slice(0, 180);

	return safe_filename || "Untitled";
}

// Always quote strings so YAML cannot interpret punctuation, dates or numbers.
export function toYamlSafeString(value: string = ""): string
{
	return JSON.stringify(value).replace(/[\u007f-\u009f\u2028\u2029]/g, character =>
		`\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
