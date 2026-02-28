import { Events, EventRef } from "obsidian";

export class SettingsService<T>
{
	private current: Readonly<T>;
	private events = new Events();

	constructor(settings: T)
	{
		this.current = Object.freeze({ ...settings  })
	}

	 /** Always returns the latest snapshot */
	get(): Readonly<T>
	{
		return this.current;
	}

	getSetting<K extends keyof T>(key: K): T[K]
	{
		return this.current[key];
	}

	/** Update the snapshot and notify listeners */
	set(next: T)
	{
		this.current = Object.freeze({ ...next });

		this.events.trigger("changed", this.current);
	}

	onChanged(cb: (s: Readonly<T>) => void): EventRef
	{
		return this.events.on("changed", cb);
	}

	off(ref: EventRef)
	{
		this.events.offref(ref);
	}
}