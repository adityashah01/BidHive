import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
pkg.scripts.test = "vitest run";
pkg.scripts["test:coverage"] = "vitest run --coverage";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
