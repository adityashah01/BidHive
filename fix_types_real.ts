import fs from 'fs';

const typesCode = `
export type Role = 'BIDDER' | 'SELLER' | 'ADMIN';

export type Condition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';

export type ListingStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SOLD' | 'ENDED' | 'CANCELLED' | 'DELETED';

export type PaymentMethod = 'ESEWA' | 'KHALTI';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'VERIFYING';

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  sellerRating: number;
  sellerRatingCount: number;
  buyerReliabilityScore: number;
  isBanned: boolean;
  avatar: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  categoryId: string;
  condition: Condition;
  startingPrice: number;
  reservePrice?: number;
  buyNowPrice?: number;
  currentPrice: number;
  startTime: string;
  endTime: string;
  status: ListingStatus;
  viewCount: number;
  images: string[];
  locationName?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  isAutoBid: boolean;
  placedAt: string;
}

export interface AutoBidConfig {
  id: string;
  listingId: string;
  bidderId: string;
  maxAmount: number;
  isActive: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  finalAmount: number;
  paymentMethod?: PaymentMethod | 'QR_CODE';
  paymentStatus: PaymentStatus;
  paymentDeadline: string;
  paymentScreenshot?: string | null;
  completedAt?: string;
}

export interface Review {
  id: string;
  transactionId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type NotificationType =
  | 'OUTBID'
  | 'AUCTION_WON'
  | 'AUCTION_ENDED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_DEADLINE'
  | 'LISTING_APPROVED'
  | 'LISTING_REJECTED'
  | 'NEW_REVIEW';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  listingId: string;
  listingTitle: string;
  reason: string;
  status: ReportStatus;
  adminNotes?: string;
  createdAt: string;
}

export interface PaymentScreenshot {
  id: string;
  transactionId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  screenshotUrl: string;
  paymentMethod: string;
  status: 'PENDING_REVIEW' | 'DONE' | 'REJECTED';
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  availableBalance: number;
  heldBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTopup {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  screenshotUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'TOPUP' | 'BID_LOCK' | 'BID_RELEASE' | 'AUCTION_PAYMENT' | 'REFUND' | 'ADMIN_ADJUSTMENT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description: string;
  createdAt: string;
}
`;

fs.writeFileSync('src/types.ts', typesCode.trim());
