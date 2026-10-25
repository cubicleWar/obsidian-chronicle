import TurndownService from "turndown";

const converter = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
converter.remove(["script", "style"]);

// Avoid parsing plain text/Markdown as HTML, which would collapse its newlines.
// Match actual formatting tags, not Markdown autolinks such as <https://...>.
const HTML_FORMATTING = /<\/?(?:p|br|div|span|b|strong|i|em|u|a|ul|ol|li|blockquote|h[1-6]|pre|code|hr|img|table|script|style)\b[^>]*>/i;

export function descriptionMarkdown(description: string | null | undefined): string | null
{
	if(description == null)
	{
		return null;
	}

	if(!HTML_FORMATTING.test(description))
	{
		return description;
	}

	// Consecutive HTML breaks represent paragraph boundaries. Keep single
	// breaks as Markdown hard breaks, and make blank lines easy to edit.
	return converter.turndown(description).replace(/(?:[ \t]*\n){2,}/g, "\n\n");
}
