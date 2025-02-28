const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

/**
 * @type {import('esbuild').Plugin}
 */
const copyWebviewResourcesPlugin = {
	name: 'copy-webview-resources',

	setup(build) {
		// Copy webview resources after each build
		build.onEnd(async () => {
			const srcDir = path.join(__dirname, 'src', 'webview', 'resources');
			const destDir = path.join(__dirname, 'dist', 'src', 'webview', 'resources');

			// Ensure destination directory exists
			if (!fs.existsSync(destDir)) {
				fs.mkdirSync(destDir, { recursive: true });
			}

			try {
				// Read all files in the source directory
				const files = fs.readdirSync(srcDir);

				// Copy each file to the destination
				for (const file of files) {
					const srcPath = path.join(srcDir, file);
					const destPath = path.join(destDir, file);

					// Only copy files, not directories
					if (fs.statSync(srcPath).isFile()) {
						fs.copyFileSync(srcPath, destPath);
						console.log(`Copied: ${file}`);
					}
				}

				console.log('Webview resources copied successfully');
			} catch (error) {
				console.error('Error copying webview resources:', error);
			}
		});
	}
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* custom plugins */
			esbuildProblemMatcherPlugin,
			copyWebviewResourcesPlugin,
		],
	});
	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
