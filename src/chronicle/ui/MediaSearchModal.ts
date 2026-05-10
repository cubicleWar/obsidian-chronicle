import { App, Modal, Notice, Setting, TextComponent } from "obsidian";
import { MediaDataOrchestrator } from "../MediaDataOrchestrator.js";
import { SearchResult } from "media/models/SearchResult.js";
import { MediaType } from "media/models/MediaType.js";
import { UserMediaSelection } from "../models/UserMediaSelection.js";



////////////////////////////////////////////////////////////////////////////
// A single action modal that:
//  - lets user type title of a movie or series depending on the mode of the modal
//  - shows search results inline
//  - resolves with the selected media item (or null if cancelled)
////////////////////////////////////////////////////////////////////////////

export class MediaSearchModal extends Modal
{
	private resolve!: (value: UserMediaSelection | null) => void;
	private settled = false;

	private query: string = "";
	private mark_watched: boolean = true;

	private titleInput?: TextComponent;
	private resultsEl?: HTMLElement;
	private statusEl?: HTMLElement;

	private debounceTimer: number | null = null;
	private requestSeq = 0;

	constructor(app: App, private service: MediaDataOrchestrator, private mode: MediaType = "movie")
	{
		super(app);
		this.modalEl.addClass("chronicle-search-modal");
	}

	openAndGetChoice(): Promise<UserMediaSelection | null>
	{
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	private settle(value: UserMediaSelection | null)
	{
		if (this.settled) return;

		this.settled = true;
		this.resolve(value);
		this.close();
	}

	onOpen()
	{
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: `Chronicle a ${this.mode}` });

		new Setting(contentEl)

			.setName("Mark as watched")
			.setDesc("Add a watched date when creating or updating the movie note.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.mark_watched)
					.onChange((value) => {
						this.mark_watched = value;
					});
			});

		// Title input
		new Setting(contentEl)
			.setName("Title")
			.setDesc("Type at least 2 characters to search")
			.addText((t) => {
				this.titleInput = t;
				t.setPlaceholder("e.g., Alien")
					.setValue(this.query)
					.onChange((v) => {
						this.query = v;
						this.queueSearch();
					});

				t.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter")
					{
						// Force immediate search on Enter (if not already)
						this.queueSearch(0);
					}
				});
			});

		// Status + results
		this.statusEl = contentEl.createDiv({ cls: "chronicle-search-status" });
		this.resultsEl = contentEl.createDiv({ cls: "chronicle-search-results" });

		// Actions
		const actions = new Setting(contentEl);
		actions.addButton((b) => b.setButtonText("Cancel").onClick(() => this.settle(null)));

		// initial search if initialQuery provided
		window.setTimeout(() => this.titleInput?.inputEl.focus(), 0);

		if (this.query.trim().length >= 2)
		{
			this.queueSearch(0);
		}
		else
		{
			this.setStatus("Type to search.");
		}
	}

	onClose()
	{
		if (!this.settled)
		{
			this.resolve(null);
		}

		this.contentEl.empty();

		if (this.debounceTimer)
		{
			window.clearTimeout(this.debounceTimer);
		}
	}

	private queueSearch(delayMs = 250)
	{
		if (this.debounceTimer) window.clearTimeout(this.debounceTimer);

		const q = this.query.trim();

		if (q.length < 2)
		{
			this.clearResults();
			this.setStatus("Type at least 2 characters.");
			return;
		}

		this.debounceTimer = window.setTimeout(() => {
			void this.runSearch(q, this.mode);
		}, delayMs);
	}

	private async runSearch(query: string, mode: MediaType)
	{
		const seq = ++this.requestSeq;

		this.setStatus("Searching...");
		this.clearResults();

		try
		{
			const results: SearchResult[] = await this.service.search(query, mode);

			if (results.length === 0)
			{
				this.setStatus("No results.");
				return;
			}

			this.setStatus(`Showing ${results.length} results`);
			this.renderResults(results);
		}
		catch (e: any)
		{
			if (seq !== this.requestSeq) return; // stale

			this.setStatus("Search failed.");
			console.error("Obsidian Chronicle - Media search error:", e);
		}
	}

	private setStatus(text: string)
	{
		if (!this.statusEl)
		{
			return;
		}

		this.statusEl.empty();
		this.statusEl.createDiv({ text });
	}

	private clearResults()
	{
		this.resultsEl?.empty();
	}

	private renderResults(results: SearchResult[])
	{
		if (!this.resultsEl)
		{
			return;
		}

		this.resultsEl.empty();

		for (const r of results)
		{
			const row = this.resultsEl.createDiv({ cls: "chronicle-result-row" });
			row.setAttr("role", "button");
			row.setAttr("tabindex", "0");
			row.setAttr("aria-label", `${r.title} (${r.year})`);

			if (r.artwork)
			{
				const posterWrap = row.createDiv({ cls: "chronicle-result-poster" });
				posterWrap.createEl("img", { attr: { src: r.artwork, alt: "" } });
			}

			// middle (text)
			const info = row.createDiv({ cls: "chronicle-result-info" });

			info.createDiv({
				cls: "chronicle-result-title",
				text: r.title
			});
			info.createDiv({
				cls: "chronicle-result-meta",
				text: `${r.year}${r.type ? ` • ${r.type}` : ""}`
			});

			const pick = () => {
				this.settle({
					type: this.mode,
					query: this.query.trim(),
					item: r,
					mark_watched: this.mark_watched
				});
			};

			row.addEventListener("click", pick);
			row.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ")
				{
					e.preventDefault();
					pick();
				}
			});
		}
	}
}