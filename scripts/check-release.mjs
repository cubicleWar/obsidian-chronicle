import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validateRelease(pkg, manifest, versions, tag)
{
	const version = manifest.version;
	if(typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Manifest version must use major.minor.patch.');
	if(pkg.version !== version) throw new Error('Package and manifest versions must match.');
	if(!Object.hasOwn(versions, version) || versions[version] !== manifest.minAppVersion) throw new Error('versions.json must map the release version to manifest.minAppVersion.');
	if(tag !== undefined && tag !== version) throw new Error(`Release tag must be exactly ${version}; received ${tag}.`);
	return version;
}

if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
{
	try
	{
		const read = name => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
		const args = process.argv.slice(2).filter(arg => arg !== '--');
		if(args.length > 1) throw new Error('Expected at most one release tag.');
		const version = validateRelease(read('package.json'), read('manifest.json'), read('versions.json'), args[0]);
		console.log(`Release metadata verified: ${version}`);
	}
	catch(error)
	{
		console.error(error.message);
		process.exitCode = 1;
	}
}
