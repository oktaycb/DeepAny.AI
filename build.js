const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

const excludes = [
    'node_modules', 'android', 'ios', 'www', '.git',
    '.gitignore', 'package.json', 'package-lock.json',
    'capacitor.config.json', 'build.js', 'README.md'
];

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) fs.mkdirSync(to);
    fs.readdirSync(from).forEach(element => {
        if (excludes.includes(element) && from === srcDir) return;
        const stat = fs.lstatSync(path.join(from, element));
        if (stat.isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else if (stat.isDirectory()) {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}

if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}
copyFolderSync(srcDir, destDir);
console.log('Build complete: Web assets cloned securely to www/ directory.');
