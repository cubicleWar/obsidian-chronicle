import Handlebars from "handlebars";
import { VaultFileService } from "./VaultFileService.js";

export class NoteRenderer<T>
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
		const data: any = this.cleanRender(model);

		if(template !== null)
		{
			const data: any = this.cleanRender(model);

			return template(data);
		}
		else
		{
			return JSON.stringify(data, null, 4);
		}
	}

	private cleanRender(source: any) : any
	{
		let data : any = {}

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
			else if(typeof value === 'object')
			{
				data[key] = this.cleanRender(value);
			}
		}

		return data
	}
}