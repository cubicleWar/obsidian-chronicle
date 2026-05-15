const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

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
		return `"${result}"`;
	}
}

export function slugifyFilename(filename: string, spacer: string = " ") : string
{
	// Obsidian is fine with many characters, but keep filenames safe across OSes.
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

/**
 * Converts a string into a YAML-safe scalar for Obsidian frontmatter.
 *
 * - Leaves simple strings unquoted.
 * - Wraps risky strings in double quotes.
 * - Escapes backslashes and double quotes inside quoted strings.
 */
export function toYamlSafeString(value: string): string
{
	const trimmed = value.trim();

	if (trimmed === "")
	{
		return '""';
	}

	const yamlBooleanOrNull = /^(true|false|null|~)$/i;
	const yamlNumber = /^[-+]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
	const yamlDate = /^\d{4}-\d{2}-\d{2}$/;
	const startsWithUnsafeChar = /^[!&*[\]{}#|>@`"'%?:,-]/;
	const containsUnsafeYamlSyntax = /[:#]\s|[\n\r\t]/;
	const hasLeadingOrTrailingWhitespace = value !== trimmed;

	const needsQuotes =
		yamlBooleanOrNull.test(trimmed) ||
		yamlNumber.test(trimmed) ||
		yamlDate.test(trimmed) ||
		startsWithUnsafeChar.test(trimmed) ||
		containsUnsafeYamlSyntax.test(value) ||
		hasLeadingOrTrailingWhitespace;

	if (!needsQuotes)
	{
		return value;
	}

	return `"${value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t")}"`;
}