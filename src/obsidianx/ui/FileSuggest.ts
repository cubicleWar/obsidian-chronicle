import { App, AbstractInputSuggest, TFile } from "obsidian";

export class FileSuggest extends AbstractInputSuggest<TFile>
{
	constructor(app: App, private inputEl: HTMLInputElement, private readonly extension?: string)
	{
		super(app, inputEl);
	}

	getSuggestions(inputStr: string): TFile[]
	{
		const query = inputStr.toLowerCase();

		return this.app.vault
			.getFiles()
			.filter((file) => {
				if (!this.extension) return true;

				return file.extension === this.extension.replace(/^\./, "");
			})
			.filter((file) => file.path.toLowerCase().includes(query))
			.sort((a, b) => a.path.localeCompare(b.path));
	}

	renderSuggestion(file: TFile, el: HTMLElement): void
	{
		const container = el.createDiv();

		container.createDiv({
			text: file.basename,
		});

		container.createDiv({
			text: file.path,
			cls: "setting-item-description",
		});
	}

	selectSuggestion(file: TFile): void
	{
		this.inputEl.value = file.path;

		this.inputEl.dispatchEvent(
			new Event("input", {
				bubbles: true,
				cancelable: true,
			})
		);

		this.close();
	}
}