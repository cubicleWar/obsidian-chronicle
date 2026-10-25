import { App, Modal, Setting, TFile } from "obsidian";

export type SavedNoteChoice = TFile | null;

export class SavedNoteSelectModal extends Modal
{
	private resolve?: (choice: SavedNoteChoice) => void;
	private selected = "0";

	constructor(app: App, private title: string, private notes: { file: TFile; label: string }[])
	{
		super(app);
		this.setTitle(title);
	}

	onOpen(): void
	{
		this.contentEl.empty();

		new Setting(this.contentEl)
			.setName(this.title)
			.addDropdown(dropdown => {
				this.notes.forEach((note, index) => { dropdown.addOption(String(index), note.label); });
				dropdown.setValue(this.selected).onChange(value => { this.selected = value; });
			});

		new Setting(this.contentEl)
			.addButton(button => button.setButtonText("Cancel").onClick(() => this.close()))
			.addButton(button => button.setButtonText("Select").setCta().onClick(() => {
				this.resolve?.(this.notes[Number(this.selected)]?.file ?? null);
				this.close();
			}));
	}

	onClose(): void
	{
		this.resolve?.(null);
		this.resolve = undefined;
	}

	openAndGetChoice(): Promise<SavedNoteChoice>
	{
		return new Promise(resolve => {
			this.resolve = resolve;
			this.open();
		});
	}
}
