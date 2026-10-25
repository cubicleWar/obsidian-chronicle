import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRelease } from '../scripts/check-release.mjs';

const pkg = { version: '2.0.0' };
const manifest = { version: '2.0.0', minAppVersion: '1.5.7' };
const versions = { '2.0.0': '1.5.7' };

test('release metadata accepts matching local builds and exact release tags', () => {
	assert.equal(validateRelease(pkg, manifest, versions), '2.0.0');
	assert.equal(validateRelease(pkg, manifest, versions, '2.0.0'), '2.0.0');
});
test('release metadata rejects mismatched versions, missing mappings and incorrect tags', () => {
	assert.throws(() => validateRelease({ version: '1.0.0' }, manifest, versions), /Package/);
	assert.throws(() => validateRelease(pkg, manifest, {}), /versions.json/);
	assert.throws(() => validateRelease(pkg, manifest, { '2.0.0': '1.6.0' }), /versions.json/);
	for(const tag of ['1.0.0', 'v2.0.0', '']) assert.throws(() => validateRelease(pkg, manifest, versions, tag), /Release tag/);
});
