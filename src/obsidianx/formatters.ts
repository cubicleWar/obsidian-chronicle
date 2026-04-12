

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
			list += `\n  - ${value[i]}`
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
		return `\"${result}\"`;
	}
}

export function slugifyFilename(filename: string, spacer: string = " ") : string
{
	// Obsidian is fine with many characters, but keep filenames safe across OSes.
	return filename
			.trim()
			.replace(/[\/\\:*?"<>|]/g, "")		// Windows-illegal
			.replace(/\s+/g, spacer)
			.replace(/\.$/, "") 				// no trailing dot on Windows
			.slice(0, 180);
}