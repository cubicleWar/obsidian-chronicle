import { getExtensionFromUrl } from "utilities/utilities.js";
import { slugifyFilename } from "utilities/parsing";

export function getPoserLocalPath(title : string, poster: string | null, imagePath: string) : string | null
{
	if(poster && poster !== "N/A")
	{
		const ext = getExtensionFromUrl(poster);

		if(imagePath !== null)
		{
			const image_filename = slugifyFilename(title, "_") + `.${ext}`
			const image_path = `${imagePath}/${image_filename}`;

			return image_path;
		}
	}

	return null;
}