import { VaultFileService } from "./VaultFileService.js";
import { NoteRenderer } from "./NoteRenderer.js";
import { Dictionary } from "utilities/models/types.js";
import { TFile } from "obsidian";

export class NoteManager
{
	constructor(private file_service: VaultFileService) {}

	// Saves a given note or adds a new watch date if the note already exists
	async createOrUpdateNote<T>(data: T, template_path: string, output_file_path: string, extra_data?: Dictionary<string | string[]>) : Promise<TFile | null>
	{
		let note_reference = this.file_service.getTFile(output_file_path);

		if(note_reference === null)
		{
			const render = new NoteRenderer<T>(this.file_service, template_path)

			const combined_data = { ...data, ...extra_data};

			const note = await render.render(combined_data);

			note_reference = await this.file_service.writeNote(output_file_path, note, true)
		}
		else
		{
			if(extra_data)
			{
				const updates = [];

				for(const [key, value] of Object.entries(extra_data))
				{
					// Update the watch dates
					updates.push(this.file_service.updateFrontmatterAttribute(note_reference, key, value, false, true));
				}

				await Promise.all(updates)
			}
		}

		return note_reference;
	}
}

