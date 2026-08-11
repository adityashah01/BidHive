const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

code = code.replace(
  "export const getWallet = async (userId: string) => {",
  "export const getWallet = async () => {"
);
code = code.replace(
  "return apiRequest(`/api/wallet/${userId}`);",
  "return apiRequest(`/api/wallet`);"
);

code = code.replace(
  "export const getWalletTransactions = async (userId: string) => {\n  const data = await apiRequest(`/api/wallet/${userId}`);\n  return data.transactions;\n};",
  "export const getWalletTransactions = async (page = 1, limit = 20) => {\n  const data = await apiRequest(`/api/wallet/transactions?page=${page}&limit=${limit}`);\n  return data.transactions;\n};"
);

fs.writeFileSync('src/lib/api.ts', code);
