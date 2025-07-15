#!/usr/bin/env node
/**
 * update.js
 *
 * 1. Optionally copies compiled static files from a source folder (arg[2]) into this directory.
 * 2. Uses simple-git to add, commit, and push changes to the main branch.
 *
 * Usage:
 *   node update.js [sourcePath]
 *
 * Example (Electron after export):
 *   node update.js ../my-electron-app/dist-web
 */
const { createRequire } = require('module');
const requireFn = createRequire(__filename);
const fs = requireFn('fs');
const path = requireFn('path');
const git = requireFn('simple-git');

// Recursively copy files from src to dest (overwrite existing)
function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source path not found: ${src}`);
    process.exit(1);
  }
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      if (item === '.git') continue; // skip git directory
      copyRecursiveSync(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

(async () => {
  try {
    const sourcePath = process.argv[2];
    const repoRoot = process.cwd();

    if (sourcePath) {
      console.log(`Copying files from ${sourcePath} to ${repoRoot} ...`);
      copyRecursiveSync(sourcePath, repoRoot);
    }

    const gitClient = git(repoRoot);

    // Ensure we are on main branch
    await gitClient.checkout('main').catch(() => {});

    await gitClient.add('.');

    const commitMsg = `auto: deploy static site ${new Date().toISOString()}`;
    const status = await gitClient.status();
    if (status.staged.length === 0) {
      console.log('No changes to commit.');
    } else {
      await gitClient.commit(commitMsg);
      console.log('Committed changes.');
    }

    console.log('Pushing to origin/main ...');
    await gitClient.push('origin', 'main');
    console.log('Push complete. Netlify will start the deploy automatically.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
