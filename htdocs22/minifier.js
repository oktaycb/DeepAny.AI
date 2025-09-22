const fs = require('fs-extra');
const path = require('path');
const { minify: minifyJs } = require('terser');
const CleanCSS = require('clean-css');
const cheerio = require('cheerio');

const srcDir = '.';
const outDir = 'minified';

let totalOriginalSize = 0;
let totalMinifiedSize = 0;

function kb(bytes) {
  return (bytes / 1024).toFixed(2);
}

async function minifyHtml(content, htmlFilePath) {
  const $ = cheerio.load(content, { decodeEntities: false });

  // Minify inline JS as before
  const scriptPromises = [];
  $('script:not([src])').each((i, el) => {
    const $el = $(el);
    const code = $el.html();
    const promise = minifyJs(code, {
      ecma: 2020,
      compress: true,
      mangle: true,
      module: true
    }).then(result => {
      $el.html(result.code || '');
    }).catch(err => {
      console.warn('⚠️ Inline JS minification error:', err.message);
    });
    scriptPromises.push(promise);
  });

  // Minify inline style tags as before
  $('style').each((_, el) => {
    const $el = $(el);
    const css = $el.html();
    const output = new CleanCSS().minify(css);
    if (!output.errors.length) {
      $el.html(output.styles);
    }
  });

  // Inline linked CSS files
  const linkPromises = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (!href) return;

    // Resolve full path of the CSS file relative to the HTML file
    const cssFilePath = path.resolve(path.dirname(htmlFilePath), href.split('?')[0]);

    const promise = fs.readFile(cssFilePath, 'utf8')
      .then(cssContent => new CleanCSS().minify(cssContent))
      .then(minified => {
        if (!minified.errors.length) {
          // Replace <link> with <style> containing minified CSS
          $el.replaceWith(`<style>${minified.styles}</style>`);
        } else {
          console.warn('⚠️ CSS minify errors in linked CSS:', minified.errors);
        }
      })
      .catch(err => {
        console.warn(`⚠️ Failed to inline CSS file ${href}:`, err.message);
      });
    linkPromises.push(promise);
  });

  await Promise.all([...scriptPromises, ...linkPromises]);

  return $.html()
    .replace(/\n\s+/g, '')
    .replace(/>\s+</g, '><')
    .trim();
}

async function minifyCssFile(content) {
  const output = new CleanCSS().minify(content);
  if (output.errors.length) {
    console.warn('⚠️ CSS minify errors:', output.errors);
    return content;
  }
  return output.styles;
}

async function processFile(srcFilePath) {
  if (srcFilePath.split(path.sep).includes('.vs')) return;
  const baseName = path.basename(srcFilePath);
  if (baseName === 'version.html') {
	  const relativePath = path.relative(srcDir, srcFilePath);
	  const destFilePath = path.join(outDir, relativePath);
	  await fs.ensureDir(path.dirname(destFilePath));
	  await fs.copyFile(srcFilePath, destFilePath);
	  console.log(`COPY: ${relativePath} (no minify)`);
	  return;
  }
  if (baseName === 'minifier.js') return
  const ext = path.extname(srcFilePath).toLowerCase();
  if (!['.html', '.js', '.css'].includes(ext)) {
    // Just copy the file, but don't count sizes in totals
    const relativePath = path.relative(srcDir, srcFilePath);
    const destFilePath = path.join(outDir, relativePath);
    await fs.ensureDir(path.dirname(destFilePath));
    await fs.copyFile(srcFilePath, destFilePath);
    console.log(`COPY: ${relativePath}`);
    return;
  }

  const relativePath = path.relative(srcDir, srcFilePath);
  const destFilePath = path.join(outDir, relativePath);
  await fs.ensureDir(path.dirname(destFilePath));

  const originalBuffer = await fs.readFile(srcFilePath);
  const originalSize = originalBuffer.byteLength;

  if (ext === '.html') {
    const content = originalBuffer.toString('utf8');
    const minified = await minifyHtml(content, srcFilePath);
    const minifiedBuffer = Buffer.from(minified, 'utf8');
    totalOriginalSize += originalSize;
    totalMinifiedSize += minifiedBuffer.byteLength;
    await fs.writeFile(destFilePath, minifiedBuffer);
    console.log(`HTML: ${relativePath} | Original: ${kb(originalSize)} KB | Minified: ${kb(minifiedBuffer.byteLength)} KB | Saved: ${kb(originalSize - minifiedBuffer.byteLength)} KB`);
  } else if (ext === '.js') {
    const content = originalBuffer.toString('utf8');
    try {
      const result = await minifyJs(content, {
        ecma: 2020,
        compress: true,
        mangle: true,
        module: true
      });
      const minifiedCode = result.code || content;
      const minifiedBuffer = Buffer.from(minifiedCode, 'utf8');
      totalOriginalSize += originalSize;
      totalMinifiedSize += minifiedBuffer.byteLength;
      await fs.writeFile(destFilePath, minifiedBuffer);
      console.log(`JS:  ${relativePath} | Original: ${kb(originalSize)} KB | Minified: ${kb(minifiedBuffer.byteLength)} KB | Saved: ${kb(originalSize - minifiedBuffer.byteLength)} KB`);
    } catch (err) {
      totalOriginalSize += originalSize;
      totalMinifiedSize += originalSize;
      await fs.writeFile(destFilePath, originalBuffer);
      console.warn(`⚠️ JS minify error in ${relativePath}:`, err.message);
    }
  } else if (ext === '.css') {
    const content = originalBuffer.toString('utf8');
    const minified = await minifyCssFile(content);
    const minifiedBuffer = Buffer.from(minified, 'utf8');
    totalOriginalSize += originalSize;
    totalMinifiedSize += minifiedBuffer.byteLength;
    await fs.writeFile(destFilePath, minifiedBuffer);
    console.log(`CSS: ${relativePath} | Original: ${kb(originalSize)} KB | Minified: ${kb(minifiedBuffer.byteLength)} KB | Saved: ${kb(originalSize - minifiedBuffer.byteLength)} KB`);
  }
}

async function processDirectory(dir) {
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    if (entry === 'minifier') continue; // Skip 'minifier' directory entirely

    const fullPath = path.join(dir, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await processDirectory(fullPath);
    } else {
      await processFile(fullPath);
    }
  }
}

(async () => {
  await processDirectory(srcDir);
  console.log('--------------------------------------------');
  console.log(`Total Original Size: ${kb(totalOriginalSize)} KB`);
  console.log(`Total Minified Size: ${kb(totalMinifiedSize)} KB`);
  console.log(`Total Saved: ${(kb(totalOriginalSize - totalMinifiedSize))} KB`);
  console.log('✔ Minification complete in "minified" folder.');
})();
