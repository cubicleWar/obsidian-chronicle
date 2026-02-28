import { App, Modal, Setting } from "obsidian";
import { MediaDataOrchestrator } from "chronicle/MediaDataOrchestrator";
import { Series } from "media/models/Series.js"
import { SeriesSeasonSummary } from "media/models/SeriesSeason";

export class SeriesSeasonSelectModal extends Modal
{
	private resolve!: (value: SeriesSeasonSummary | null) => void;
	private selected_season: SeriesSeasonSummary | null = null;

	constructor(public app: App, service: MediaDataOrchestrator, private series: Series)
	{
		super(app);
		this.setTitle(`Select season of ${series.title}`);
	}

	onOpen()
	{
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: `Select season of ${this.series.title}` });

		const seasons = this.series.seasons;

		if (seasons.length === 0)
		{
			contentEl.createEl("p", { text: "No seasons available." });

			new Setting(contentEl).addButton(btn =>
				btn.setButtonText("Close").setCta().onClick(() => {
					this.resolve(null);
					this.close();
				})
			);

			return;
		}

		// Dropdown options: label -> value (string)
		const dropdownOptions: Record<string, string> = {};

		for (const s of seasons)
		{
			const label = this.formatSeasonLabel(s);
			dropdownOptions[label] = String(s.season_number);
		}

		new Setting(contentEl)
			.setName("Season")
			.setDesc("Choose a season to continue.")
			.addDropdown(dd => {
				dd.addOptions(dropdownOptions);

				// Set default selection
				//dd.setValue(String(this.selected_season?.season_number));

				dd.onChange((value) => {
					const v = Number(value);
					const season = seasons.find(s => s.season_number == v);
					console.log(v);
					console.log(season);
					console.log(seasons)

					this.selected_season = season ?? null;
				});
			});

		// Actions row
		const actions = new Setting(contentEl);
		actions.addButton(btn =>
			btn.setButtonText("Cancel").onClick(() => {
			this.resolve(null);
			this.close();
			})
		);

		actions.addButton(btn =>
			btn.setButtonText("Select").setCta().onClick(() => {
				this.resolve(this.selected_season);
				this.close();
			})
		);
	}

	openAndGetChoice(): Promise<SeriesSeasonSummary | null>
	{
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	formatSeasonLabel(s: SeriesSeasonSummary): string
	{
		const baseName = s.title?.trim() || (s.season_number === 0 ? "Specials" : `Season ${s.season_number}`);

		const parts: string[] = [baseName];

		if (typeof s.episode_count === "number") parts.push(`${s.episode_count} episodes`);

		if (s.air_date) parts.push(s.air_date);

		return parts.join(" — ");
	}

}