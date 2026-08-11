import fs from 'fs';
let content = fs.readFileSync('src/db/schema.ts', 'utf-8');

// Add import
if (!content.includes('customType')) {
  content = content.replace("import { pgTable,", "import { pgTable, customType,");
}

const customNumericCode = `
const money = customType<{ data: number; driverData: string }>({
  dataType() {
    return 'numeric(14,2)';
  },
  toDriver(value: number): string {
    return value.toString();
  },
  fromDriver(value: string): number {
    return Number(value);
  },
});
`;

if (!content.includes('const money = customType')) {
  // insert after imports
  const importEnd = content.indexOf(';\n', content.lastIndexOf('import ')) + 2;
  content = content.substring(0, importEnd) + customNumericCode + content.substring(importEnd);
}

// Replace all `numeric('...', { precision: 14, scale: 2 })` with `money('...')`
content = content.replace(/numeric\('([^']+)', \{ precision: 14, scale: 2 \}\)/g, "money('$1')");
// Just in case I missed some without spaces:
content = content.replace(/numeric\('([^']+)',\{precision:14,scale:2\}\)/g, "money('$1')");

fs.writeFileSync('src/db/schema.ts', content);
