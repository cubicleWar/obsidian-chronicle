import { App, AbstractInputSuggest, TFolder } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder>
{
	constructor(app: App, private inputEl: HTMLInputElement)
	{
		super(app, inputEl);
	}

	getSuggestions(inputStr: string): TFolder[]
	{
		const query = inputStr.toLowerCase();

		return this.app.vault
			.getAllLoadedFiles()
			.filter((file): file is TFolder => file instanceof TFolder)
			.filter((folder) => folder.path.toLowerCase().includes(query))
			.sort((a, b) => a.path.localeCompare(b.path));
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.createDiv({
			text: folder.path || "/",
		});
	}

	selectSuggestion(folder: TFolder): void
	{
		this.inputEl.value = folder.path;

		this.inputEl.dispatchEvent(
			new Event("input", {
				bubbles: true,
				cancelable: true,
			})
		);

		this.close();
	}
}
