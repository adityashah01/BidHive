const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');
code = code.replace(
  "async updateListingStatus(id: string, status: string) {",
  `async deleteListing(id: string) {
    return apiRequest(\`/api/admin/listings/\${id}\`, {
      method: 'DELETE',
    });
  },

  async updateListingStatus(id: string, status: string) {`
);
fs.writeFileSync('src/lib/api.ts', code);
