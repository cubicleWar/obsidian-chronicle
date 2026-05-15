import { App, TFile, Vault } from "obsidian";
import { downloadBinaryFile } from "utilities/files.js";
import { PrimitiveValue } from "utilities/models/types";
//type FrontmatterPrimitive = string | number | boolean | null;
type FrontmatterValue = PrimitiveValue | PrimitiveValue[];
type FrontmatterRecord = Record<string, FrontmatterValue | undefined>;

export class VaultFileService
{
	constructor(private app: App, private vault: Vault) {}

	async openNote(note: TFile)
	{
		await this.app.workspace.getLeaf(true).openFile(note);
	}

	async readNote(note_reference: string | TFile): Promise<string | null>
	{
		const file = this.getTFile(note_reference);

		if(file !== null)
		{
			return await this.vault.read(file);
		}
		else
		{
			return null
		}
	}

	async writeNote(path: string, content: string, overwrite: boolean = false) : Promise<TFile>
	{
		return this.vault.create(path, content);
	}

	async writeBinary(path: string, data: ArrayBuffer, overwrite: boolean = false)
	{
		const file = this.getTFile(path);

		if(file === null)
		{
			return this.vault.createBinary(path, data);
		}
		else if(file !== null && overwrite)
		{
			return this.vault.modifyBinary(file, data);
		}
	}

	async addFileFromUrl(url: string, output_path: string, overwrite: boolean = false) : Promise<TFile | void>
	{
		const trimmedUrl = url.trim();

		if (!trimmedUrl)
		{
			return;
		}

		await this.ensureParentFolders(output_path);

		const data = await downloadBinaryFile(url);

		return this.writeBinary(output_path, data, overwrite)
	}

	getTFile(ref: string | TFile) : TFile | null
	{
		if (ref instanceof TFile) return ref;

		const raw = ref.trim();

		if (!raw)
		{
			return null;
		}

		// Vault-relative path; add .md if no extension is specified
		const path = /\.[^./\\]+$/.test(raw) ? raw : `${raw}.md`;

		const af = this.vault.getAbstractFileByPath(path);

		if (!af || !(af instanceof TFile))
		{
			return null
		}

		return af;
	}

	///////////////////////////////////////////////////////////////////////////////
	//
	// Atomically updates a frontmatter value
	//
	// @param key		- The key of the frontmatter attribute
	// @param value		- The value to write for the attribute
	// @param overwrite - Overwrites the current attribute value if it exists
	// @param forceList - Will result in the attribute value to be an array/list
	// @param dedupe 	- Will deduplicate an any parameter lists
	//
	///////////////////////////////////////////////////////////////////////////////
	async updateFrontmatterAttribute(
		file: TFile,
		key: string,
		value?: FrontmatterValue,
		overwrite: boolean = false,
		forceList: boolean = false,
		dedupe: boolean = true
	): Promise<void>
	{
		await this.app.fileManager.processFrontMatter(file, (fm: FrontmatterRecord) => {
			const existing = fm[key];

			const asArray = (v: FrontmatterValue | undefined): PrimitiveValue[] => {
				if (Array.isArray(v)) return v;
				if (v === undefined || v === null) return [];

				return [v];
			};

			const dedupeArray = (arr: PrimitiveValue[]): PrimitiveValue[] =>
				dedupe ? Array.from(new Set(arr)) : arr;

			if (overwrite)
			{
				if (value === undefined)
				{
					delete fm[key];
				}
				else
				{
					fm[key] = forceList ? asArray(value) : value;
				}
			}
			else
			{
				if(value === undefined)
				{
					return;
				}

				if(Array.isArray(existing) || Array.isArray(value) || forceList)
				{
					const toAdd = asArray(value);
					let next = [...asArray(existing), ...toAdd];

					next = dedupe ? dedupeArray(next) : next;

					fm[key] = next;
				}
				else if(existing === undefined || existing === null || existing === "")
				{
					fm[key] = value;
				}
				else
				{
					fm[key] = `${existing} ${value}`;
				}
			}

			return;
		});
	}

	private async ensureParentFolders(file_path: string): Promise<void>
	{
		const idx = file_path.lastIndexOf("/");
		const folder_path = idx === -1 ? "" : file_path.slice(0, idx);

		if (!await this.app.vault.adapter.exists(folder_path))
		{
			await this.app.vault.createFolder(folder_path);
		}
	}
}
