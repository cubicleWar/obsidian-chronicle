import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const { outputFiles } = await build({
	stdin: { contents: `export { SavedNoteSelectModal } from './src/chronicle/ui/SavedNoteSelectModal.ts';`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
	bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false,
});

function setup()
{
	const buttons = new Map(), options = new Map();
	let change;
	class Setting
	{
		setName() { return this; }
		addDropdown(callback) {
			const dropdown = { addOption: (value, label) => { options.set(value, label); return dropdown; }, setValue: () => dropdown, onChange: fn => { change = fn; return dropdown; } };
			callback(dropdown); return this;
		}
		addButton(callback) {
			let label;
			const button = { setButtonText: value => { label = value; return button; }, setCta: () => button, onClick: fn => { buttons.set(label, fn); return button; } };
			callback(button); return this;
		}
	}
	const obsidian = { Setting, Modal: class {
		contentEl = { empty() {} };
		setTitle() {}
		open() { this.onOpen(); }
		close() { this.onClose(); }
	} };

	const module = { exports: {} };
	new Function('require', 'module', 'exports', outputFiles[0].text)(() => obsidian, module, module.exports);
	const file = { path: 'Renamed/Season.md' };
	const second = { path: 'Other/Season.md' };
	const modal = new module.exports.SavedNoteSelectModal({}, 'Choose a saved season', [{ file, label: 'Season 0 — Specials' }, { file: second, label: second.path }]);
	return { modal, file, second, buttons, options, choose: value => change(value) };
}

test('saved-note picker selects the actual file, including a season zero entry', async () => {
	const h = setup(); const result = h.modal.openAndGetChoice();
	assert.equal(h.options.get('0'), 'Season 0 — Specials');
	h.buttons.get('Select')();
	assert.equal(await result, h.file);
});

test('saved-note picker selects a second matching note', async () => {
	const h = setup(); const result = h.modal.openAndGetChoice();
	assert.equal(h.options.get('1'), h.second.path);
	h.choose('1'); h.buttons.get('Select')();
	assert.equal(await result, h.second);
});

test('closing or cancelling the picker resolves without selecting a note', async () => {
	for(const cancelButton of [true, false])
	{
		const h = setup(); const result = h.modal.openAndGetChoice();
		assert.equal(h.options.has('fetch'), false);
		if(cancelButton) h.buttons.get('Cancel')(); else h.modal.close();
		assert.equal(await result, null);
	}
});
