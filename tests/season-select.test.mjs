import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const { outputFiles } = await build({
	stdin: { contents: `export { SeriesSeasonSelectModal } from './src/chronicle/ui/SeriesSeasonSelectModal.ts';`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
	bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false,
});
function setup(numbers = [2])
{
	const buttons = new Map(), options = new Map();
	let change, selected;
	class Setting {
		setName() { return this; }
		setDesc() { return this; }
		addDropdown(callback) {
			const dropdown = { addOption: (value, label) => { options.set(value, label); return dropdown; }, setValue: value => { selected = value; return dropdown; }, onChange: fn => { change = fn; return dropdown; } };
			callback(dropdown); return this;
		}
		addButton(callback) {
			let label;
			const button = { setButtonText: value => { label = value; return button; }, setCta: () => button, onClick: fn => { buttons.set(label, fn); return button; } };
			callback(button); return this;
		}
	}
	const obsidian = { Setting, Modal: class {
		contentEl = { empty() {}, createEl() {} };
		setTitle() {}
		open() { this.onOpen(); }
		close() { this.onClose(); }
	} };
	const module = { exports: {} };
	new Function('require', 'module', 'exports', outputFiles[0].text)(() => obsidian, module, module.exports);
	const modal = new module.exports.SeriesSeasonSelectModal({}, null, { title: 'Show', seasons: numbers.map(season_number => ({ season_number })) });
	return { modal, buttons, options, get selected() { return selected; }, choose: value => change(value) };
}

for(const numbers of [[2], [0], [0, 1, 2]])
{
	test(`season picker defaults to an available season for ${numbers}`, async () => {
		const h = setup(numbers); const result = h.modal.openAndGetChoice();
		const expected = numbers.includes(1) ? 1 : numbers[0];
		assert.equal(h.selected, String(expected));
		h.buttons.get('Select')();
		assert.equal(await result, expected);
	});
}

test('season picker submits a changed selection and rejects unavailable values', async () => {
	for(const [selection, expected] of [['3', 3], ['99', null]])
	{
		const h = setup([2, 3]); const result = h.modal.openAndGetChoice();
		h.choose(selection); h.buttons.get('Select')();
		assert.equal(await result, expected);
	}
});

test('season picker cancellation and dismissal settle, including an empty season list', async () => {
	for(const numbers of [[2], []])
	{
		for(const dismiss of [true, false])
		{
			const h = setup(numbers); const result = h.modal.openAndGetChoice();
			if(dismiss)
			{
				h.modal.close();
			}
			else
			{
				h.buttons.get(numbers.length ? 'Cancel' : 'Close')();
			}

			const sentinel = Symbol('pending');
			assert.equal(await Promise.race([result, Promise.resolve(sentinel)]), null);
		}
	}
});
