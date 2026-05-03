import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const isWatch = process.argv.includes("--watch");
const production = process.argv.includes("production");

const buildOptions = {
	entryPoints: ["src/main.ts"],
	bundle: true,
	format: "cjs",
	target: "es2020",
	outfile: "main.js",
	logLevel: "info",
	sourcemap: production ? false : "inline",
	treeShaking: true,
	minify: production,
	external: [
		"obsidian",
		...builtins
	]
};

if (isWatch)
{
	const ctx = await esbuild.context(buildOptions);
	await ctx.watch();
	console.log("Watching...");
}
else if(production)
{
	await esbuild.build(buildOptions);
}
else
{
	const ctx = await esbuild.context(buildOptions);
	await ctx.rebuild();
	await ctx.dispose();
}