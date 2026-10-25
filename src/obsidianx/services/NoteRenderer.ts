import Handlebars from "handlebars";
import { VaultFileService } from "./VaultFileService.js";
import { RecordLike } from "utilities/models/types.js";
import { isRecordLike } from "utilities/models/typeguards.js";

type HandlebarsTemplateDelegate<TContext = unknown> = Handlebars.TemplateDelegate<TContext>;

export class NoteRenderer<T extends object>
{
	private template_source: string | null = null;
	private _template: HandlebarsTemplateDelegate | null = null;

	constructor(private file_service: VaultFileService, private template_path: string) {}

	private async getTemplate() : Promise<HandlebarsTemplateDelegate | null>
	{
		// Read the current source on every render, including reused renderers.
		const note = await this.file_service.readNote(this.template_path);

		if(note === null)
		{
			this.template_source = null;
			this._template = null;
			return null;
		}

		if(this._template === null || note !== this.template_source)
		{
			this._template = Handlebars.compile(note, {noEscape: true});
			this.template_source = note;
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
			else if(typeof value === 'string' || typeof value === 'boolean' || Number.isFinite(value))
			{
				data[key] = value
			}
			else if(Array.isArray(value))
			{
				// Keep lists structured for YAML rendering and Handlebars iteration.
				data[key] = value.filter(x => !!x);
			}
			else if(isRecordLike(value))
			{
				data[key] = this.cleanRender(value);
			}
		}

		return data
	}
}
