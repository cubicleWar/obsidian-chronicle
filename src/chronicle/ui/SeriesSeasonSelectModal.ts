import { App, Modal, Setting } from "obsidian";
import { MediaDataOrchestrator } from "chronicle/MediaDataOrchestrator";
import { Series } from "media/models/Series.js"
import { SeriesSeasonSummary } from "media/models/SeriesSeason";

export class SeriesSeasonSelectModal extends Modal
{
	private resolve!: (value: number | null) => void;
	private selected_season: number = 1;

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

		new Setting(contentEl)
			.setName("Season")
			.setDesc("Choose a season to continue.")
			.addDropdown(dd => {

				for (const s of seasons)
				{
					const label = this.formatSeasonLabel(s);
					dd.addOption(String(s.season_number), label)
				}

				// Set default selection
				dd.setValue(String(this.selected_season));

				dd.onChange((value) => {
					this.selected_season = Number(value);
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

	openAndGetChoice(): Promise<number | null>
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

		if (typeof s.episode_count === "number")
		{
			parts.push(`${s.episode_count} episodes`);
		}

		if (s.air_date)
		{
			parts.push(s.air_date);
		}

		return parts.join(" — ");
	}
}