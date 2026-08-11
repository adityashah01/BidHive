import { auth } from './firebase.ts';
import { signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';

let idToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('bidhive_token') : null;

// Setup listener for firebase auth tokens
auth.onIdTokenChanged(async (user) => {
  if (user) {
    idToken = await user.getIdToken();
    if (typeof window !== 'undefined') {
      localStorage.setItem('bidhive_token', idToken);
      window.dispatchEvent(new Event('auth_token_changed'));
    }
  } else {
    // If we have a firebase token, but user is null, we clear it.
    // But if it's a demo/mock token, we keep it since it's managed via loginWithDemo.
    if (idToken && !idToken.startsWith('demo_') && !idToken.startsWith('usr-')) {
      idToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bidhive_token');
        window.dispatchEvent(new Event('auth_token_changed'));
      }
    }
  }
});

export const getAuthToken = (): string | null => {
  return idToken;
};

export const setAuthToken = (token: string | null) => {
  idToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('bidhive_token', token);
    } else {
      localStorage.removeItem('bidhive_token');
    }
  }
};

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'API request failed');
  }

  try {
    return await response.json();
  } catch (e) {
    throw new Error(`Failed to parse JSON for ${path}: ${(e as Error).message}`);
  }
}

export const api = {
  // Authentication
  async getProfile() {
    return apiRequest('/api/auth/me');
  },
  async updateRole(role: 'BIDDER' | 'SELLER' | 'ADMIN') {
    return apiRequest('/api/auth/role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    setAuthToken(token);
    return apiRequest('/api/auth/me');
  },
  async loginWithDemo(mockUid: string) {
    setAuthToken(`demo_${mockUid}`);
    return apiRequest('/api/auth/me');
  },
  async register(data: any) {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(res.token);
    return res.user;
  },
  async login(data: any) {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.requires2FA) {
      return res; // Return `{ requires2FA: true, userId: ... }`
    }
    setAuthToken(res.token);
    return res.user;
  },
  async verify2FA(userId: string, code: string) {
    const res = await apiRequest('/api/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ userId, code }),
    });
    setAuthToken(res.token);
    return res.user;
  },
  async forgotPassword(email: string) {
    return apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  async getRecentEmails(email: string) {
    return apiRequest(`/api/auth/recent-emails?email=${encodeURIComponent(email)}`);
  },
  async resetPassword(data: any) {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async toggle2FA(enabled: boolean) {
    return apiRequest('/api/auth/toggle-2fa', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },
  async getSecurityLogs() {
    return apiRequest('/api/security/audit-logs');
  },
  async logout() {
    setAuthToken(null);
    await signOut(auth).catch(() => {});
  },

  // Categories
  async getCategories() {
    return apiRequest('/api/categories');
  },

  // Listings
  async getListings(filters: { categoryId?: string; search?: string; status?: string } = {}) {
    const params = new URLSearchParams();
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    
    return apiRequest(`/api/listings?${params.toString()}`);
  },
  async getListing(id: string) {
    return apiRequest(`/api/listings/${id}`);
  },
  async createListing(data: any) {
    return apiRequest('/api/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Bidding
  async placeBid(listingId: string, amount: number) {
    return apiRequest(`/api/listings/${listingId}/bid`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
  async configureAutoBid(listingId: string, maxAmount: number) {
    return apiRequest(`/api/listings/${listingId}/autobid`, {
      method: 'POST',
      body: JSON.stringify({ maxAmount }),
    });
  },
  async buyNow(listingId: string) {
    return apiRequest(`/api/listings/${listingId}/buynow`, {
      method: 'POST',
    });
  },

  // Item Follow & Alert Notifications
  async getListingFollow(listingId: string) {
    return apiRequest(`/api/listings/${listingId}/follow`);
  },
  async setListingFollow(listingId: string, data: {
    targetPriceThreshold?: number | null;
    notifyOnOutbid?: boolean;
    notifyOnPriceThreshold?: boolean;
    notifyInApp?: boolean;
    notifyEmail?: boolean;
  }) {
    return apiRequest(`/api/listings/${listingId}/follow`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async unfollowListing(listingId: string) {
    return apiRequest(`/api/listings/${listingId}/follow`, {
      method: 'DELETE',
    });
  },
  async getUserFollows() {
    return apiRequest('/api/user/follows');
  },

  // Transactions & Reviews
  async getTransactions() {
    return apiRequest('/api/transactions');
  },
  async settlePayment(transactionId: string, paymentMethod: 'ESEWA' | 'KHALTI') {
    return apiRequest(`/api/transactions/${transactionId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
    });
  },
  async uploadPaymentScreenshot(transactionId: string, screenshot: string, paymentMethod?: string) {
    return apiRequest(`/api/transactions/${transactionId}/screenshot`, {
      method: 'POST',
      body: JSON.stringify({ screenshot, paymentMethod }),
    });
  },
  async verifyAdminPayment(transactionId: string, action: 'APPROVE' | 'REJECT') {
    return apiRequest(`/api/admin/transactions/${transactionId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },
  async submitReview(data: { transactionId: string; revieweeId: string; rating: number; comment: string }) {
    return apiRequest('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Notifications
  async getNotifications(params?: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.unreadOnly) query.append('unreadOnly', 'true');
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    const endpoint = `/api/notifications${qs ? `?${qs}` : ''}`;
    return apiRequest(endpoint);
  },
  async markNotificationRead(id: string) {
    return apiRequest(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },
  async markNotificationsRead() {
    return apiRequest('/api/notifications/read-all', {
      method: 'PATCH',
    });
  },
  async getUnreadCount() {
    return apiRequest('/api/notifications/unread-count');
  },

  // Reports
  async submitReport(data: { listingId: string; listingTitle: string; reason: string }) {
    return apiRequest('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Admin Panel Actions
  async deleteListing(id: string, reason: string, confirmationText: string) {
    return apiRequest(`/api/admin/listings/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason, confirmationText }),
    });
  },

  async deleteUser(id: string) {
    return apiRequest(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteDbRecord(tableName: string, id: string) {
    return apiRequest(`/api/admin/db/${tableName}/${id}`, {
      method: 'DELETE',
    });
  },

  async updateListingStatus(id: string, status: string) {
    return apiRequest(`/api/admin/listings/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
  async getAdminUsers() {
    return apiRequest('/api/admin/users');
  },
  async updateUserAction(id: string, actionData: { role?: string; isBanned?: boolean }) {
    return apiRequest(`/api/admin/users/${id}/action`, {
      method: 'POST',
      body: JSON.stringify(actionData),
    });
  },
  async getAdminReports() {
    return apiRequest('/api/admin/reports');
  },
  async resolveReport(id: string, status: string, adminNotes?: string) {
    return apiRequest(`/api/admin/reports/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status, adminNotes }),
    });
  },
  async getAdminStats() {
    return apiRequest('/api/admin/stats');
  },
  async getAdminEmails() {
    return apiRequest('/api/admin/emails');
  },
  async getAdminAudits() {
    return apiRequest('/api/admin/audits');
  },
  async getAdminDbTables(table?: string) {
    const url = table ? `/api/admin/db-tables?table=${table}` : '/api/admin/db-tables';
    return apiRequest(url);
  },
  async resetAdminDb() {
    return apiRequest('/api/admin/db-reset', {
      method: 'POST',
    });
  },
  async makeAllListingsLive() {
    return apiRequest('/api/admin/make-all-live', {
      method: 'POST',
    });
  },
  async getPaymentScreenshots() {
    return apiRequest('/api/admin/payment-screenshots');
  },
  async approvePaymentScreenshot(id: string) {
    return apiRequest(`/api/admin/payment-screenshots/${id}/approve`, {
      method: 'POST',
    });
  },
  async rejectPaymentScreenshot(id: string, reason: string) {
    return apiRequest(`/api/admin/payment-screenshots/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  async getBids() {
    return apiRequest('/api/bids');
  },
  async getWallet() {
    return apiRequest('/api/wallet');
  },
  async createWalletTopup(data: any) {
    return apiRequest('/api/wallet/topup', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async getWalletTransactions(page = 1, limit = 20) {
    const data = await apiRequest(`/api/wallet/transactions?page=${page}&limit=${limit}`);
    return data.transactions;
  }
};


// Wallet APIs
export const getWallet = async () => {
  return apiRequest(`/api/wallet`);
};

export const createWalletTopup = async (data: any) => {
  return apiRequest('/api/wallet/topup', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getWalletTopupsAdmin = async () => {
  return apiRequest('/api/admin/topups');
};

export const approveWalletTopup = async (topupId: string, data?: any) => {
  return apiRequest(`/api/admin/topups/${topupId}/approve`, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  });
};

export const rejectWalletTopup = async (topupId: string, adminNote: string) => {
  return apiRequest(`/api/admin/topups/${topupId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ adminNote })
  });
};

export const getWalletTransactions = async (page = 1, limit = 20) => {
  const data = await apiRequest(`/api/wallet/transactions?page=${page}&limit=${limit}`);
  return data.transactions;
};

export const getAdminWallets = async (search = '') => {
  return apiRequest(`/api/admin/wallets?search=${encodeURIComponent(search)}`);
};

export const adjustAdminWallet = async (userId: string, amount: number, reason: string, action: 'CREDIT' | 'DEBIT') => {
  const idempotencyKey = crypto.randomUUID();
  const endpoint = action === 'CREDIT' ? `/api/admin/wallets/${userId}/credit` : `/api/admin/wallets/${userId}/debit`;
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ amount, reason, idempotencyKey, category: 'MANUAL_ADJUSTMENT' })
  });
};

// --- TOPUP MANAGEMENT API ---
export const getWalletTopups = async () => apiRequest('/api/wallet/topups');
export const cancelWalletTopup = async (id: string) => apiRequest(`/api/wallet/topups/${id}/cancel`, { method: 'POST' });
export const submitWalletTopup = async (data: any) => {
  const idempotencyKey = crypto.randomUUID();
  return apiRequest('/api/wallet/topups', { method: 'POST', body: JSON.stringify({ ...data, idempotencyKey }) });
};

// --- ADMIN TOPUP API ---
export const getAdminTopups = async () => apiRequest('/api/admin/topups');
export const approveTopup = async (id: string, data: any) => apiRequest(`/api/admin/topups/${id}/approve`, { method: 'POST', body: JSON.stringify(data) });
export const rejectTopup = async (id: string, rejectionReason: string) => apiRequest(`/api/admin/topups/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejectionReason }) });

// --- ADMIN MANUAL WALLET ADJUSTMENTS ---
export const creditUserWallet = async (userId: string, data: any) => {
  const idempotencyKey = crypto.randomUUID();
  return apiRequest(`/api/admin/wallets/${userId}/credit`, { method: 'POST', body: JSON.stringify({ ...data, idempotencyKey }) });
};
export const debitUserWallet = async (userId: string, data: any) => {
  const idempotencyKey = crypto.randomUUID();
  return apiRequest(`/api/admin/wallets/${userId}/debit`, { method: 'POST', body: JSON.stringify({ ...data, idempotencyKey }) });
};
export const getAdminUserWalletTransactions = async (userId: string) => apiRequest(`/api/admin/wallets/${userId}/transactions`);
