import { App, TFile, Vault } from "obsidian";

export class VaultFileService
{
	private readonly vault: Vault;

	constructor(vault: Vault)
	{
		this.vault = vault;
	}

	async loadNote(path: string): Promise<string | null>
	{
		const file = this.vault.getAbstractFileByPath(path);

		if (!(file instanceof TFile) || file.extension !== "md")
		{
			return null;
		}

		return await this.vault.read(file);
	}

	async writeNote(path: string, content: string, overwrite: boolean = false)
	{
		this.vault.create(path, content);
	}
}



