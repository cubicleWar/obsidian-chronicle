import esbuild from "esbuild";
import process from "process";

const isWatch = process.argv.includes("--watch");

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	format: "cjs",
	target: "es2020",
	outfile: "main.js",
	sourcemap: isWatch,
	external: ["obsidian"],
	logLevel: "info"
});

if (isWatch) {
	await context.watch();
	console.log("Watching...");
} else {
	await context.rebuild();
	await context.dispose();
}