import { build } from 'esbuild';
import { readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isWatch = process.argv.includes('--watch');

async function runBuild() {
  try {
    // Ensure dist directory exists
    mkdirSync(join(__dirname, 'dist'), { recursive: true });

    const buildOptions = {
      entryPoints: [join(__dirname, 'src/uxtest.js')],
      bundle: true,
      minify: true,
      sourcemap: true,
      outfile: join(__dirname, 'dist/uxtest.min.js'),
      format: 'iife',
      target: ['es2017'],
      banner: {
        js: `/* UXTest SDK v1.0.0 | Privacy-first UX testing */`
      }
    };

    if (isWatch) {
      const ctx = await build({ ...buildOptions, logLevel: 'info' });
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      await build(buildOptions);
      console.log('SDK built successfully: dist/uxtest.min.js');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

runBuild();
