const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

const walletApis = `
// Wallet APIs
export const getWallet = async (userId: string) => {
  const res = await api.get(\`/wallet/\${userId}\`);
  return res.data;
};

export const createWalletTopup = async (data: any) => {
  const res = await api.post('/wallet/topup', data);
  return res.data;
};

export const getWalletTopupsAdmin = async () => {
  const res = await api.get('/admin/wallet-topups');
  return res.data;
};

export const approveWalletTopup = async (topupId: string) => {
  const res = await api.post(\`/admin/wallet-topups/\${topupId}/approve\`);
  return res.data;
};

export const rejectWalletTopup = async (topupId: string, adminNote: string) => {
  const res = await api.post(\`/admin/wallet-topups/\${topupId}/reject\`, { adminNote });
  return res.data;
};

export const getWalletTransactions = async (userId: string) => {
  const res = await api.get(\`/wallet/\${userId}\`);
  return res.data.transactions;
};
`;

code = code + '\n' + walletApis;
fs.writeFileSync('src/lib/api.ts', code);
