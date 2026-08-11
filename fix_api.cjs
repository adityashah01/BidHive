const fs = require('fs');

let content = fs.readFileSync('src/lib/api.ts', 'utf8');

const oldApis = `// Wallet APIs
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
};`;

const newApis = `// Wallet APIs
export const getWallet = async (userId: string) => {
  return apiRequest(\`/api/wallet/\${userId}\`);
};

export const createWalletTopup = async (data: any) => {
  return apiRequest('/api/wallet/topup', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getWalletTopupsAdmin = async () => {
  return apiRequest('/api/admin/wallet-topups');
};

export const approveWalletTopup = async (topupId: string) => {
  return apiRequest(\`/api/admin/wallet-topups/\${topupId}/approve\`, {
    method: 'POST'
  });
};

export const rejectWalletTopup = async (topupId: string, adminNote: string) => {
  return apiRequest(\`/api/admin/wallet-topups/\${topupId}/reject\`, {
    method: 'POST',
    body: JSON.stringify({ adminNote })
  });
};

export const getWalletTransactions = async (userId: string) => {
  const data = await apiRequest(\`/api/wallet/\${userId}\`);
  return data.transactions;
};`;

content = content.replace(oldApis, newApis);
fs.writeFileSync('src/lib/api.ts', content);

