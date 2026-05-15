import Handlebars from "handlebars";
import { VaultFileService } from "./VaultFileService.js";
import { RecordLike } from "utilities/models/types.js";
import { isRecordLike } from "utilities/models/typeguards.js";

type HandlebarsTemplateDelegate<TContext = unknown> = Handlebars.TemplateDelegate<TContext>;

export class NoteRenderer<T extends object>
{
	private static template_cache = new Map<string, HandlebarsTemplateDelegate>()
	private _template: HandlebarsTemplateDelegate | null = null;

	constructor(private file_service: VaultFileService, private template_path: string) {}

	private async getTemplate() : Promise<HandlebarsTemplateDelegate | null>
	{
		if(this._template === null)
		{
			// Check if template is in cache
			if(NoteRenderer.template_cache.has(this.template_path))
			{
				this._template = <HandlebarsTemplateDelegate>NoteRenderer.template_cache.get(this.template_path);
			}
			else
			{
				const note = await this.file_service.readNote(this.template_path);

				if(note === null)
				{
					// The template doesn't exist at the specified path
					// Skip caching and return null
					return null;
				}

				this._template = Handlebars.compile(note, {noEscape: true});
				NoteRenderer.template_cache.set(this.template_path, this._template);
			}

			return this._template;
		}

		return this._template;
	}

	async render(model: T) : Promise<string>
	{
		const template = await this.getTemplate();
		const data: RecordLike = this.cleanRender(model);

		if(template !== null)
		{
			return template(data);
		}
		else
		{
			return JSON.stringify(data, null, 4);
		}
	}

	private cleanRender(source: object) : RecordLike
	{
		let data : RecordLike = {}

		for(const [key, value] of Object.entries(source))
		{
			if(value === null)
			{
				data[key] = "";
			}
			else if(typeof value === 'string' || Number.isFinite(value))
			{
				data[key] = value
			}
			else if(Array.isArray(value))
			{
				data[key] = value.filter(x => !!x).join(", ");
			}
			else if(isRecordLike(value))
			{
				data[key] = this.cleanRender(value);
			}
		}

		return data
	}
}
