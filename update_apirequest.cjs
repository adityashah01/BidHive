const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

const regex = /return response.json\(\);/;
const replacement = `try {
    return await response.json();
  } catch (e) {
    throw new Error(\`Failed to parse JSON for \${path}: \${(e as Error).message}\`);
  }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/api.ts', code);
