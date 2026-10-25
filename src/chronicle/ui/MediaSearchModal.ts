import { App, Modal, Setting, TextComponent } from "obsidian";
import { SearchResult } from "media/models/SearchResult.js";
import { MediaType } from "media/models/MediaType.js";
import { UserMediaSelection } from "../models/UserMediaSelection.js";
import { DataSearchOrchestrator } from "../services/DataOrchestrator.js";

const getDefaultMetaString = (r: SearchResult): string => `${r.year}${r.type ? ` • ${r.type}` : ""}`;

export class MediaSearchModal extends Modal
{
	private resolve!: (value: UserMediaSelection | null) => void;
	private settled = false;
	private action_verb: string = "watched";
	private query: string = "";
	private mark_complete: boolean = true;

	private titleInput?: TextComponent;
	private resultsEl?: HTMLElement;
	private statusEl?: HTMLElement;

	private debounceTimer: number | null = null;
	private requestSeq = 0;

	constructor(app: App, private service: DataSearchOrchestrator, private mode: MediaType, private meta_string_fn: (r: SearchResult) => string = getDefaultMetaString)
	{
		super(app);
		this.modalEl.addClass("chronicle-search-modal");

		if(mode === "book")
		{
			this.action_verb = "read";
		}
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
		if (this.settled)
		{
			return;
		}

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
			.setName("Mark as " + this.action_verb)
			.setDesc("Add the date you " + this.action_verb + " the title.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.mark_complete)
					.onChange((value) => {
						this.mark_complete = value;
					});
			});

		// Title input
		new Setting(contentEl)
			.setName("Title")
			.setDesc("Type at least 2 characters to search")
			.addText((t) => {
				this.titleInput = t;
				t.setPlaceholder("Alien")
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
		this.requestSeq++;

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
		this.requestSeq++;

		if (this.debounceTimer)
		{
			window.clearTimeout(this.debounceTimer);
		}

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

			if (seq !== this.requestSeq)
			{
				return;
			}

			if (results.length === 0)
			{
				this.setStatus("No results.");
				return;
			}

			this.setStatus(`Showing ${results.length} results`);
			this.renderResults(results);
		}
		catch (e: unknown)
		{
			if (seq !== this.requestSeq)
			{
				return; // stale
			}

			this.setStatus(mode === "book" && e instanceof Error ? `Search failed: ${e.message}` : "Search failed.");
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
				text: this.meta_string_fn(r)
			});

			const pick = () => {
				this.settle({
					type: this.mode,
					query: this.query.trim(),
					item: r,
					mark_complete: this.mark_complete
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
