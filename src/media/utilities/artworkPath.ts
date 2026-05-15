import { getExtensionFromUrl } from "utilities/files.js";
import { slugifyFilename } from "obsidianx/helpers/formatters.js";

export function getArtworkLocalPath(title : string, artwork: string | null, imagePath: string) : string
{
	if(artwork && artwork !== "N/A")
	{
		const ext = getExtensionFromUrl(artwork);

		if(imagePath !== null)
		{
			const image_filename = slugifyFilename(title, "_") + `.${ext}`
			const image_path = `${imagePath}/${image_filename}`;

			return image_path;
		}
	}

	return "";
}