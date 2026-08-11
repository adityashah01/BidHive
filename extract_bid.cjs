const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');

let startIndex = -1;
let endIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("app.post('/api/listings/:id/bid', requireAuth")) {
    startIndex = i;
  }
  if (startIndex !== -1 && i > startIndex && lines[i].startsWith("  });")) {
    endIndex = i;
    break;
  }
}
console.log(startIndex, endIndex);
