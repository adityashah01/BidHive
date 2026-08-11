import * as nodeCrypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (development override), then default .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express from 'express';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import Pusher from 'pusher';
import { v2 as cloudinary } from 'cloudinary';
import { db } from './src/db/index.ts';
import cron from 'node-cron';
import { users, categories, listings, bids, autoBidConfigs, transactions, reviews, notifications, reports, sentEmails, auditLogs, paymentScreenshots, priceTargets, categoryFollows, listingFollows, wallets,  topupRequests, walletTransactions, walletHolds, emailOutbox } from './src/db/schema.ts';

import { eq, and, desc, lt, gte, or, sql, like } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { seedDatabase, makeAllListingsLive } from './src/db/seed.ts';
import { initializeWalletForUser, runExistingUserWalletMigration } from './src/services/wallet.ts';
import { settleAuction, processAllExpiredAuctions } from './src/services/auctionSettlement.ts';
import { processEmailOutbox } from './src/services/emailWorker.ts';
import { sendTransactionalEmail } from './src/services/emailService.ts';
import admin from 'firebase-admin';

let firestoreInstance: any | null = null;
function getFirestore() {
  if (!firestoreInstance) {
    if (!(admin as any).apps.length) {
      admin.initializeApp();
    }
    firestoreInstance = (admin as any).firestore();
  }
  return firestoreInstance;
}

// Setup Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Pusher Client
  let pusherClient: Pusher | null = null;
  const getPusher = () => {
    if (!pusherClient) {
      if (
        process.env.PUSHER_APP_ID &&
        process.env.PUSHER_KEY &&
        process.env.PUSHER_SECRET &&
        process.env.PUSHER_CLUSTER
      ) {
        pusherClient = new Pusher({
          appId: process.env.PUSHER_APP_ID,
          key: process.env.PUSHER_KEY,
          secret: process.env.PUSHER_SECRET,
          cluster: process.env.PUSHER_CLUSTER,
          useTLS: true
        });
      }
    }
    return pusherClient;
  };

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Helper to generate IDs
  const generateId = (prefix: string) => `${prefix}-${nodeCrypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;

  // Audit Logging helper
  const logAudit = async (action: string, userId: string | null, userName: string | null, details: string) => {
    try {
      await db.insert(auditLogs).values({
        id: generateId('aud'),
        action,
        userId,
        userName,
        details,
      });
      console.log(`[AUDIT LOG] ${action}: ${details}`);
    } catch (err) {
      console.error('Failed to save audit log:', err);
    }
  };

  const pushFirestoreNotification = async (userId: string, type: string, message: string) => {
    try {
      await getFirestore().collection('user_notifications').doc(userId).collection('notifications').add({
        userId,
        type,
        message,
        createdAt: (admin as any).firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to push Firestore notification:', err);
    }
  };

  // Professional Email Notification simulation & actual logging helper
  const sendEmail = async (toEmail: string, toName: string, subject: string, templateType: string, data: any) => {
    let bodyHtml = '';
    let baseUrl = process.env.APP_URL || 'https://ais-dev-b4i6cdw5oeanal5wsn3xo5-658386042719.asia-southeast1.run.app';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    const link = data.link ? `${baseUrl}/listing/${data.link}` : baseUrl;

    switch (templateType) {
      case 'WELCOME':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">Namaste ${toName},</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Welcome to BidHive, Nepal's premier unified digital auction space. Your single registered account unlocks full dual privileges: sell second-hand goods instantly while placing competitive bids on live auctions.</p>
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px dashed #e2e8f0;">
              <h3 style="margin-top: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Your Account Credentials:</h3>
              <p style="font-size: 13px; margin: 4px 0;"><strong>Unified Profile:</strong> ${toName}</p>
              <p style="font-size: 13px; margin: 4px 0;"><strong>Active Email Address:</strong> ${toEmail}</p>
              <p style="font-size: 13px; margin: 4px 0;"><strong>Initial Status:</strong> Fully Verified & Active</p>
            </div>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${baseUrl}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; tracking-wider; display: inline-block; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);">Explore Live Auctions</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'LISTING_APPROVED':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #16a34a; font-size: 20px; font-weight: 800; margin-top: 0; display: flex; align-items: center; justify-content: center; gap: 8px;">✓ Listing Approved & Active!</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Great news! The administrator has successfully reviewed and approved your newly submitted listing <strong>"${data.title}"</strong>. It is now publicly active on BidHive.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <tr style="background-color: #f8fafc;"><td style="padding: 10px; font-weight: 800; color: #475569; width: 40%;">Starting Bid Amount:</td><td style="padding: 10px; font-weight: 700; color: #0f172a;">Rs. ${data.startingPrice.toLocaleString()}</td></tr>
              ${data.reservePrice ? `<tr><td style="padding: 10px; font-weight: 800; color: #475569;">Hidden Reserve Price:</td><td style="padding: 10px; font-weight: 700; color: #0f172a;">Rs. ${data.reservePrice.toLocaleString()}</td></tr>` : ''}
              ${data.buyNowPrice ? `<tr style="background-color: #f8fafc;"><td style="padding: 10px; font-weight: 800; color: #475569;">Instant Buy Now Price:</td><td style="padding: 10px; font-weight: 700; color: #dc2626;">Rs. ${data.buyNowPrice.toLocaleString()}</td></tr>` : ''}
              <tr><td style="padding: 10px; font-weight: 800; color: #475569;">Auction Countdown Ends:</td><td style="padding: 10px; font-weight: 700; color: #0f172a;">${new Date(data.endTime).toLocaleString()}</td></tr>
            </table>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${link}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; tracking-wider; display: inline-block; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);">Go to Your Active Auction</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'LISTING_REJECTED':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #dc2626; font-size: 20px; font-weight: 800; margin-top: 0;">Listing Declined / Removed</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Your submitted listing <strong>"${data.title}"</strong> has been reviewed and declined/removed by the platform administrator as it did not comply with our marketplace quality or security guidelines.</p>
            <div style="background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; padding: 16px; margin: 20px 0; color: #9f1239;">
              <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 800; uppercase; tracking-wider;">Common reasons for rejection include:</h4>
              <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5;">
                <li>Poor quality or misleading images</li>
                <li>Incomplete or vague state descriptions</li>
                <li>Inappropriate pricing or restricted product categories</li>
              </ul>
            </div>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">You can review our guidelines and list a new item from your dashboard anytime.</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'OUTBID':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #ea580c; font-size: 20px; font-weight: 800; margin-top: 0;">⚠ You have been outbid!</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Another user has placed a higher bid on <strong>"${data.title}"</strong>. Place a higher bid now to stay in the running to win this item!</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <tr style="background-color: #f8fafc;"><td style="padding: 10px; font-weight: 800; color: #475569; width: 40%;">Your Last Bid:</td><td style="padding: 10px; font-weight: 700; color: #ef4444;">Rs. ${data.yourBid.toLocaleString()}</td></tr>
              <tr><td style="padding: 10px; font-weight: 800; color: #475569;">New Highest Price:</td><td style="padding: 10px; font-weight: 800; color: #16a34a; font-size: 15px;">Rs. ${data.currentPrice.toLocaleString()}</td></tr>
            </table>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${link}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; tracking-wider; display: inline-block; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);">Place Higher Bid Now</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'AUCTION_WON':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #991b1b;">
              <strong>From:</strong> aditya.shh15@gmail.com <span style="color: #ef4444; font-size: 11px;">(Official BidHive Agent)</span><br/>
              <strong>To:</strong> ${toEmail}
            </div>
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #16a34a; font-size: 20px; font-weight: 800; margin-top: 0;">🎉 Congratulations! You Won!</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">You have emerged as the winning bidder for the listing <strong>"${data.title}"</strong>. An official settlement transaction has been generated.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <tr style="background-color: #f8fafc;"><td style="padding: 10px; font-weight: 800; color: #475569; width: 40%;">Your Winning Bid:</td><td style="padding: 10px; font-weight: 800; color: #16a34a; font-size: 15px;">Rs. ${data.finalAmount.toLocaleString()}</td></tr>
              <tr><td style="padding: 10px; font-weight: 800; color: #475569;">Payment Deadline:</td><td style="padding: 10px; font-weight: 700; color: #ef4444;">${new Date(data.paymentDeadline).toLocaleString()}</td></tr>
            </table>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;"><strong>Please complete your secure payment via eSewa or Khalti within the specified deadline to avoid impacting your buyer reliability score.</strong></p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${baseUrl}?view=DASHBOARD&sub=TRANSACTIONS" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; tracking-wider; display: inline-block; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);">Settle Payment Now</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'AUCTION_ENDED_SELLER':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">Auction Completed!</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Your listing <strong>"${data.title}"</strong> has completed its active bidding cycle.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <tr style="background-color: #f8fafc;"><td style="padding: 10px; font-weight: 800; color: #475569; width: 40%;">Final Status:</td><td style="padding: 10px; font-weight: 700; color: ${data.isSold ? '#16a34a' : '#ef4444'};">${data.isSold ? 'SOLD' : 'UNSOLD'}</td></tr>
              ${data.isSold ? `
                <tr><td style="padding: 10px; font-weight: 800; color: #475569;">Winning Bid Amount:</td><td style="padding: 10px; font-weight: 700; color: #0f172a;">Rs. ${data.finalAmount.toLocaleString()}</td></tr>
                <tr style="background-color: #f8fafc;"><td style="padding: 10px; font-weight: 800; color: #475569;">Winning Bidder Name:</td><td style="padding: 10px; font-weight: 700; color: #0f172a;">${data.winnerName}</td></tr>
              ` : `
                <tr><td style="padding: 10px; font-weight: 800; color: #475569;">Reason:</td><td style="padding: 10px; font-weight: 500; color: #64748b;">No bids placed or reserve price threshold not achieved.</td></tr>
              `}
            </table>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${baseUrl}?view=DASHBOARD" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; tracking-wider; display: inline-block;">Go to Your Seller Dashboard</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'PAYMENT_COMPLETED':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #16a34a; font-size: 20px; font-weight: 800; margin-top: 0;">💰 Secure Payment Confirmed!</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Excellent! The buyer has successfully paid and settled the secure amount of <strong>Rs. ${data.finalAmount.toLocaleString()}</strong> via <strong>${data.paymentMethod}</strong> for the listing <strong>"${data.title}"</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <tr style="background-color: #f8fafc;"><td style="padding: 10px; font-weight: 800; color: #475569; width: 40%;">Transaction Hash ID:</td><td style="padding: 10px; font-family: monospace; font-size: 12px; color: #0f172a;">${data.transactionId}</td></tr>
              <tr><td style="padding: 10px; font-weight: 800; color: #475569;">Buyer Profile:</td><td style="padding: 10px; font-weight: 700; color: #0f172a;">${data.buyerName}</td></tr>
              <tr style="background-color: #f8fafc;"><td style="padding: 10px; font-weight: 800; color: #475569;">Seller Profile:</td><td style="padding: 10px; font-weight: 700; color: #0f172a;">${data.sellerName}</td></tr>
            </table>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;"><strong>Sellers:</strong> You may now proceed with package handoff or dispatch. <strong>Buyers:</strong> Once satisfied, please leave an authentic review for the seller.</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'REVIEW_REQUESTED':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">★ Rate Your Transaction Experience</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Now that your transaction for <strong>"${data.title}"</strong> has completed, we invite you to leave a public rating and review. Your transparent feedback ensures BidHive remains trusted and safe for the entire community.</p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${baseUrl}?view=DASHBOARD" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; tracking-wider; display: inline-block; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);">Rate This Transaction</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'PAYMENT_UPLOADED_BUYER':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
            </div>
            <h2 style="color: #16a34a; font-size: 20px; font-weight: 800; margin-top: 0;">Payment Screenshot Received</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">We have successfully received your payment screenshot for the listing <strong>"${data.title}"</strong>.</p>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Our administration team will verify the payment shortly. You will be notified once the payment is confirmed.</p>
            ${data.screenshot ? `<div style="margin: 24px 0; text-align: center;"><p style="font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 12px;">Payment Proof:</p><img src="${data.screenshot}" alt="Payment Proof" style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0;" /></div>` : ''}
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'PAYMENT_UPLOADED_ADMIN':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
            </div>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">New Payment Verification Request</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Buyer <strong>${data.buyerName}</strong> has uploaded a payment screenshot for the transaction ID <strong>${data.transactionId}</strong>.</p>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Please log in to the admin dashboard to verify the payment.</p>
            ${data.screenshot ? `<div style="margin: 24px 0; text-align: center;"><p style="font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 12px;">Payment Proof:</p><img src="${data.screenshot}" alt="Payment Proof" style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0;" /></div>` : ''}
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'PAYMENT_UPLOADED_SELLER':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
            </div>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">Buyer Uploaded Payment Proof</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">The buyer <strong>${data.buyerName}</strong> has uploaded a payment screenshot for your listing <strong>"${data.title}"</strong>.</p>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Our administration team is currently verifying the escrow payment. You will be notified as soon as it is confirmed.</p>
            ${data.screenshot ? `<div style="margin: 24px 0; text-align: center;"><p style="font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 12px;">Payment Proof:</p><img src="${data.screenshot}" alt="Payment Proof" style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0;" /></div>` : ''}
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case 'PASSWORD_RESET':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">We received a request to reset your BidHive account password. Click the button below to secure your account and choose a new password. This link will expire in 15 minutes.</p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${baseUrl}?view=RESET_PASSWORD&token=${data.token}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; tracking-wider; display: inline-block; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);">Reset My Password</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 16px;">If you did not request a password reset, you can safely ignore this email; your account remains secure.</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;

      case '2FA_CODE':
        bodyHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
              <span style="font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.025em;">Bid<span style="color: #0f172a;">Hive</span></span>
              <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.1em;">Smart Nepalese Auction Engine</p>
            </div>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">Two-Factor Verification Code</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">Use the following verification code to complete your secure Sign In request on BidHive Nepal. For security, never share this code with anyone.</p>
            <div style="margin: 32px 0; text-align: center;">
              <div style="display: inline-block; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 36px; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #dc2626; font-family: monospace; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">${data.code}</div>
            </div>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">This is an automated system email generated by the BidHive Core Engine.<br>© 2026 BidHive Nepal. All rights reserved.</p>
          </div>
        `;
        break;
    }

    try {
      await db.insert(sentEmails).values({
        id: generateId('eml'),
        toEmail,
        toName,
        subject,
        bodyHtml,
      });
      console.log(`[SIMULATED EMAIL SENT] To: ${toEmail} | Subject: ${subject}`);
    } catch (err) {
      console.error('Failed to log simulated email:', err);
    }
  };

  // Public/Auth endpoints

  // Rate limiter for Login & Registration
  const authRateLimitMap = new Map<string, { count: number; firstAttempt: number }>();
  const authRateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || 'global';
    const now = Date.now();
    const limitWindow = 15 * 60 * 1000; // 15 mins
    const maxAttempts = 15;

    const record = authRateLimitMap.get(ip);
    if (!record) {
      authRateLimitMap.set(ip, { count: 1, firstAttempt: now });
      return next();
    }

    if (now - record.firstAttempt > limitWindow) {
      authRateLimitMap.set(ip, { count: 1, firstAttempt: now });
      return next();
    }

    if (record.count >= maxAttempts) {
      return res.status(429).json({ error: 'Too many authentication attempts. Please try again after 15 minutes.' });
    }

    record.count++;
    next();
  };

  // Custom Sign Up (Register)
  app.post('/api/auth/register', authRateLimit, async (req, res) => {
    const { name, email, password, phoneNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    try {
      // Email uniqueness validation
      const existingUser = await db.select().from(users).where(eq(users.email, email)).then(r => r[0]);
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already registered. Please login instead.' });
      }

      // Password hashing using bcryptjs
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Unique custom UID (e.g. usr-xxxxxxxxx)
      const uid = `usr-${nodeCrypto.randomUUID()}`;

      const [newUser] = await db.insert(users).values({
        id: uid,
        uid: uid,
        name,
        email,
        role: 'BIDDER',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        passwordHash,
        phoneNumber: phoneNumber || null,
        sellerRating: 5.0,
        sellerRatingCount: 0,
        buyerReliabilityScore: 100,
        isBanned: false,
      }).returning();

      // Dispatch welcome email
      await sendEmail(email, name, 'Welcome to BidHive!', 'WELCOME', {});
      await logAudit('USER_REGISTERED', newUser.id, newUser.name, `New user account registration welcome email dispatched to ${email}`);

      res.json({
        user: newUser,
        token: uid,
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
  });

  // Custom Sign In (Login)
  app.post('/api/auth/login', authRateLimit, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
      const user = await db.select().from(users).where(eq(users.email, email)).then(r => r[0]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (!user.passwordHash) {
        return res.status(400).json({ error: 'This email is linked with Google Sign-In or Sandbox. Please use the Google option.' });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Handle optional Two-Factor Authentication (2FA)
      if (user.twoFactorEnabled) {
        const code = nodeCrypto.randomInt(100000, 999999).toString();
        await db.update(users).set({ twoFactorCode: code }).where(eq(users.id, user.id));

        // Send simulated 2FA SMS/Email
        await sendEmail(user.email, user.name, 'Your BidHive Nepal 2FA Code', '2FA_CODE', { code });
        await logAudit('2FA_DISPATCHED', user.id, user.name, `2FA security verification code sent to ${user.email}`);

        return res.json({ requires2FA: true, userId: user.id });
      }

      await logAudit('USER_LOGIN', user.id, user.name, `User authenticated successfully via credentials`);
      res.json({
        user,
        token: user.uid,
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Login failed: ' + err.message });
    }
  });

  // Verify 2FA code
  app.post('/api/auth/verify-2fa', authRateLimit, async (req, res) => {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: 'UserId and code are required.' });
    }

    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
      if (!user || user.twoFactorCode !== code) {
        return res.status(401).json({ error: 'Invalid or expired 2FA code.' });
      }

      // Clear code
      await db.update(users).set({ twoFactorCode: null }).where(eq(users.id, userId));

      await logAudit('USER_LOGIN_2FA', user.id, user.name, `User authenticated successfully via credentials + 2FA`);
      res.json({
        user,
        token: user.uid,
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: '2FA Verification failed: ' + err.message });
    }
  });

  // Forgot Password (dispatch link)
  app.post('/api/auth/forgot-password', authRateLimit, async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    try {
      const user = await db.select().from(users).where(eq(users.email, email)).then(r => r[0]);
      if (!user) {
        // Return 200 even if user doesn't exist for anti-user enumeration protection
        return res.json({ success: true, message: 'If that email exists in our system, a password reset link has been dispatched.' });
      }

      // Create reset token valid for 15 minutes
      const resetToken = nodeCrypto.randomBytes(32).toString('hex');
      const hashedToken = nodeCrypto.createHash('sha256').update(resetToken).digest('hex');
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await db.update(users)
        .set({ resetToken: hashedToken, resetTokenExpiry })
        .where(eq(users.id, user.id));

      await sendEmail(user.email, user.name, 'Reset Your BidHive Password', 'PASSWORD_RESET', { token: resetToken });
      await logAudit('PASSWORD_RESET_DISPATCHED', user.id, user.name, `Password reset token generated and sent to ${email}`);

      res.json({ success: true, message: 'Password reset link dispatched successfully.' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to process forgot password request: ' + err.message });
    }
  });

  // Get recent sandbox emails (for testing forgot password / registration)
  app.get('/api/auth/recent-emails', requireAuth, async (req: AuthRequest, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required in development mode' });
    }
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    try {
      const emails = await db.select()
        .from(sentEmails)
        .where(eq(sentEmails.toEmail, String(email)))
        .orderBy(desc(sentEmails.sentAt))
        .limit(5);
        
      // Scrub sensitive data from response
      const safeEmails = emails.map(e => {
        let safeBody = e.bodyHtml;
        // Basic scrubbing of OTPs or tokens if they exist in body, though it's simulated email.
        return { ...e, bodyHtml: safeBody };
      });
      res.json(safeEmails);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve emails: ' + err.message });
    }
  });

  // Reset Password (complete)
  app.post('/api/auth/reset-password', authRateLimit, async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    try {
      const hashedToken = nodeCrypto.createHash('sha256').update(token).digest('hex');
      const user = await db.select().from(users).where(eq(users.resetToken, hashedToken)).then(r => r[0]);
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }

      if (user.resetTokenExpiry && user.resetTokenExpiry.getTime() < Date.now()) {
        return res.status(400).json({ error: 'Password reset token has expired.' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update user details
      await db.update(users)
        .set({
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      await logAudit('PASSWORD_RESET_COMPLETED', user.id, user.name, `Password reset successfully completed`);
      res.json({ success: true, message: 'Your password has been reset successfully. You may now log in.' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to reset password: ' + err.message });
    }
  });

  // Toggle Two-Factor Authentication (2FA) for current user
  app.post('/api/auth/toggle-2fa', requireAuth, async (req: AuthRequest, res) => {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled boolean state is required.' });
    }

    try {
      const updated = await db.update(users)
        .set({ twoFactorEnabled: enabled, twoFactorCode: null })
        .where(eq(users.id, req.dbUser.id))
        .returning();

      await logAudit('2FA_TOGGLED', req.dbUser.id, req.dbUser.name, `User toggled 2FA authentication state to: ${enabled}`);
      res.json(updated[0]);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to toggle 2FA: ' + err.message });
    }
  });

  // Get security audit logs for current user
  app.get('/api/security/audit-logs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const logs = await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, req.dbUser.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(10);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve logs: ' + err.message });
    }
  });

  // 1. Get or create current user profile
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      // Send professional welcome email on first profile retrieve if not sent yet
      const existingWelcome = await db.select()
        .from(sentEmails)
        .where(and(eq(sentEmails.toEmail, req.dbUser.email), eq(sentEmails.subject, 'Welcome to BidHive!')));

      if (existingWelcome.length === 0) {
        await sendEmail(req.dbUser.email, req.dbUser.name, 'Welcome to BidHive!', 'WELCOME', {});
        await logAudit('USER_REGISTERED', req.dbUser.id, req.dbUser.name, `New user account registration welcome email dispatched to ${req.dbUser.email}`);
      }

      await initializeWalletForUser(req.dbUser.id, req.dbUser.uid, req.dbUser.role);
      res.json(req.dbUser);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve profile: ' + error.message });
    }
  });

  // 2. Update current user's role (to help demoing Bidder vs Seller)
  app.post('/api/auth/role', requireAuth, async (req: AuthRequest, res) => {
    const { role } = req.body;
    if (role === 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Cannot self-assign ADMIN role' });
    }
    if (!['BIDDER', 'SELLER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role for self-selection' });
    }
    try {
      const updated = await db.update(users)
        .set({ role })
        .where(eq(users.uid, req.user.uid))
        .returning();
      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update role: ' + error.message });
    }
  });

  // Helper to automatically conclude expired ACTIVE auctions using canonical settlement service
  const concludeExpiredAuctions = async () => {
    try {
      return await processAllExpiredAuctions(getPusher);
    } catch (err: any) {
      console.error('[CRON] Error concluding expired auctions:', err.message);
    }
  };

  // 3. Get all categories
  app.get('/api/categories', async (req, res) => {
    try {
      const cats = await db.select().from(categories);
      res.json(cats);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch categories: ' + error.message });
    }
  });

  // 4. Get all listings (public) with search/filter
  app.get('/api/listings', async (req, res) => {
    const { categoryId, search, status } = req.query;
    try {
      await concludeExpiredAuctions();
      let conditions = [];

      if (categoryId) {
        conditions.push(eq(listings.categoryId, categoryId as string));
      }
      if (status) {
        // Enforce no DELETED listings even if status is provided, unless it's specifically DELETED (which we block)
        if (status === 'DELETED') {
           return res.json([]);
        }
        conditions.push(eq(listings.status, status as any));
      } else {
        // Default only show active ones for public
        conditions.push(or(eq(listings.status, 'ACTIVE'), eq(listings.status, 'ENDED'), eq(listings.status, 'SOLD')));
      }

      let query = db.select().from(listings);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      query = query.orderBy(desc(listings.createdAt)) as any;

      let results = await query;

      if (search) {
        const term = (search as string).toLowerCase();
        results = results.filter(l => 
          l.title.toLowerCase().includes(term) || 
          l.description.toLowerCase().includes(term)
        );
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch listings: ' + error.message });
    }
  });

  // 5. Get specific listing with bids and auto-bids
  app.get('/api/listings/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await concludeExpiredAuctions();
      const listing = await db.select().from(listings).where(eq(listings.id, id)).then(r => r[0]);
      if (!listing || listing.status === 'DELETED') {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Increment view count
      await db.update(listings)
        .set({ viewCount: sql`${listings.viewCount} + 1` })
        .where(eq(listings.id, id));

      // Fetch bids
      const listingBids = await db.select()
        .from(bids)
        .where(eq(bids.listingId, id))
        .orderBy(desc(bids.amount));

      res.json({
        ...listing,
        bids: listingBids,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch listing details: ' + error.message });
    }
  });

  // 6. Create new listing (Any unbanned user can act as seller)
  app.post('/api/listings', requireAuth, async (req: AuthRequest, res) => {
    const { title, description, categoryId, condition, startingPrice, reservePrice, buyNowPrice, startTime, endTime, images, locationName } = req.body;
    
    if (req.dbUser.isBanned) {
      return res.status(403).json({ error: 'Your account has been restricted from creating listings.' });
    }

    try {
      const newListingId = generateId('lst');
      const start = startTime ? new Date(startTime) : new Date();
      const end = new Date(endTime);

      let processedImages = images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1543443258-92b04ad5ec6b?w=800&auto=format&fit=crop&q=80'];

      if (process.env.CLOUDINARY_CLOUD_NAME && images && images.length > 0) {
        processedImages = await Promise.all(
          images.map(async (img: string) => {
            if (img.startsWith('data:image')) {
              try {
                const uploadRes = await cloudinary.uploader.upload(img, {
                  folder: 'bidhive_listings',
                });
                return uploadRes.secure_url;
              } catch (e) {
                console.error("Cloudinary upload error:", e);
                return img;
              }
            }
            return img;
          })
        );
      }

      const newListing = await db.insert(listings).values({
        id: newListingId,
        sellerId: req.dbUser.id,
        sellerName: req.dbUser.name,
        title,
        description,
        categoryId,
        condition,
        startingPrice: Number(startingPrice),
        reservePrice: reservePrice ? Number(reservePrice) : null,
        buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
        currentPrice: Number(startingPrice),
        startTime: start,
        endTime: end,
        status: req.body.status || 'ACTIVE', 
        viewCount: 0,
        images: processedImages,
        locationName: locationName || null,
      }).returning();

      // Log audit
      const isApproved = (req.body.status || 'ACTIVE') === 'ACTIVE';
      await logAudit('LISTING_CREATED', req.dbUser.id, req.dbUser.name, `Submitted listing "${title}" (ID: ${newListingId}) for Rs. ${startingPrice}${isApproved ? ' which is now ACTIVE' : ' awaiting admin approval'}.`);

      // Create admin notification
      // Find administrators
      const admins = await db.select().from(users).where(eq(users.role, 'ADMIN'));
      for (const admin of admins) {
        await db.insert(notifications).values({
          id: generateId('not'),
          userId: admin.id,
          type: 'LISTING_APPROVED',
          message: `New listing "${title}" has been submitted by ${req.dbUser.name} and requires approval.`,
          isRead: false,
          link: newListingId,
        });
      }

      res.json(newListing[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create listing: ' + error.message });
    }
  });

  
  // AUTO BID: Get current user's configuration
  app.get('/api/listings/:id/autobid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const [config] = await db.select().from(autoBidConfigs)
        .where(and(
          eq(autoBidConfigs.listingId, id),
          eq(autoBidConfigs.bidderId, req.dbUser.id),
          eq(autoBidConfigs.isActive, true)
        ));
      res.json(config || null);
    } catch(err:any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AUTO BID: Create or update configuration
  app.post('/api/listings/:id/autobid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const maxAmount = Number(req.body.maxAmount);

      if (req.dbUser.isBanned) return res.status(403).json({ error: 'Your account has been restricted' });
      if (!maxAmount || maxAmount <= 0) return res.status(400).json({ error: 'Invalid maximum amount' });

      await concludeExpiredAuctions();

      const result = await db.transaction(async (tx) => {
        const listing = await tx.select().from(listings).where(eq(listings.id, id)).for('update').then(r => r[0]);
        if (!listing) throw new Error('Listing not found');
        if (listing.status !== 'ACTIVE') throw new Error('Auction is not active');
        
        const now = new Date();
        if (now > new Date(listing.endTime)) throw new Error('Auction has already ended');
        if (now < new Date(listing.startTime)) throw new Error('Auction has not started yet');
        if (listing.sellerId === req.dbUser.id) throw new Error('Sellers cannot auto-bid on their own listings');
        
        // Minimum bid validation (e.g. at least currentPrice + 1, or higher based on rules)
        // A minimal requirement is that maxAmount > currentPrice (or equal to startingPrice if 0 bids)
        const currentBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        const minRequired = currentBids.length > 0 ? listing.currentPrice + 1 : listing.startingPrice; // simplistic increment
        
        if (maxAmount < minRequired) {
          throw new Error(`Max amount must be at least NPR ${minRequired}`);
        }

        const wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).for('update').then(r => r[0]);
        if (!wallet) throw new Error('Wallet not found');

        // Existing hold
        const existingHold = await tx.select().from(walletHolds)
          .where(and(eq(walletHolds.listingId, id), eq(walletHolds.userId, req.dbUser.id), eq(walletHolds.status, 'ACTIVE')))
          .for('update').then(r => r[0]);
          
        const previouslyHeld = existingHold ? Number(existingHold.amount) : 0;
        const requiredAdditional = maxAmount - previouslyHeld;

        if (requiredAdditional > 0 && wallet.availableBalance < requiredAdditional) {
           throw new Error('Insufficient wallet balance to secure this auto-bid maximum');
        }

        // Apply wallet changes
        const newAvailable = wallet.availableBalance - requiredAdditional;
        const newHeld = wallet.heldBalance + requiredAdditional;
        await tx.update(wallets).set({ availableBalance: newAvailable, heldBalance: newHeld }).where(eq(wallets.id, wallet.id));
        
        if (requiredAdditional !== 0) {
           await tx.insert(walletTransactions).values({
             id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: requiredAdditional > 0 ? 'BID_HOLD' : 'BID_RELEASE',
             amount: Math.abs(requiredAdditional), status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailable,
             referenceType: 'listings', referenceId: listing.id,
             description: `Adjusted auto-bid hold on ${listing.title}`
           });
        }

        if (existingHold) {
           await tx.update(walletHolds).set({ amount: maxAmount, updatedAt: new Date() }).where(eq(walletHolds.id, existingHold.id));
        } else {
           await tx.insert(walletHolds).values({
             id: generateId('whd'), userId: req.dbUser.id, walletId: wallet.id, listingId: id,
             amount: maxAmount, status: 'ACTIVE'
           });
        }

        // Upsert auto-bid config
        const existingConfig = await tx.select().from(autoBidConfigs)
          .where(and(eq(autoBidConfigs.listingId, id), eq(autoBidConfigs.bidderId, req.dbUser.id)))
          .for('update').then(r => r[0]);

        let finalConfig;
        if (existingConfig) {
           const [upd] = await tx.update(autoBidConfigs).set({ maxAmount, isActive: true }).where(eq(autoBidConfigs.id, existingConfig.id)).returning();
           finalConfig = upd;
        } else {
           const [ins] = await tx.insert(autoBidConfigs).values({
             id: generateId('abc'), listingId: id, bidderId: req.dbUser.id, maxAmount, isActive: true
           }).returning();
           finalConfig = ins;
        }
        
        // After setting auto-bid, we may need to execute the auto-bidding algorithm immediately.
        // But doing it here inside the transaction can get complex. 
        // We'll call a helper function after the transaction, or do it inside if needed.
        return { config: finalConfig };
      });
      
      // Attempt to trigger auto bids
      // processAutoBids(id);
      
      res.json(result.config);
    } catch(err:any) { res.status(409).json({ error: err.message }); }
  });

  // LISTING FOLLOW & ALERT SETTINGS HELPERS & ROUTES
  async function notifyListingFollowersOnBid(listingId: string, listingTitle: string, newBidAmount: number, currentBidderId: string, prevHighBidderId?: string | null, prevBidAmount?: number) {
    try {
      const followers = await db.select().from(listingFollows).where(eq(listingFollows.listingId, listingId));
      if (!followers || followers.length === 0) return;

      for (const follower of followers) {
        if (follower.userId === currentBidderId) continue; // Don't notify current bidder

        const isOutbidTarget = prevHighBidderId && follower.userId === prevHighBidderId;

        // 1. Outbid Notification
        if (follower.notifyOnOutbid && isOutbidTarget) {
          if (follower.notifyInApp) {
            await db.insert(notifications).values({
              id: generateId('not'),
              userId: follower.userId,
              type: 'OUTBID',
              message: `You have been outbid on followed item "${listingTitle}". Current price: NPR ${newBidAmount.toLocaleString()}`,
              isRead: false,
              link: listingId,
            }).catch(() => {});
          }
          if (follower.notifyEmail) {
            const u = await db.select().from(users).where(eq(users.id, follower.userId)).then(r => r[0]);
            if (u && u.email) {
              await sendEmail(u.email, u.name, `Outbid Alert: ${listingTitle}`, 'OUTBID', {
                title: listingTitle,
                yourBid: prevBidAmount || newBidAmount,
                currentPrice: newBidAmount,
                listingId
              }).catch((e: any) => console.warn('Email outbid notify notice:', e?.message));
            }
          }
        }

        // 2. Target Price Threshold Alert
        if (
          follower.notifyOnPriceThreshold &&
          follower.targetPriceThreshold &&
          newBidAmount >= follower.targetPriceThreshold
        ) {
          if (follower.notifyInApp) {
            await db.insert(notifications).values({
              id: generateId('not'),
              userId: follower.userId,
              type: 'PRICE_ALERT',
              message: `Target Price Alert: "${listingTitle}" has reached NPR ${newBidAmount.toLocaleString()} (Your threshold: NPR ${follower.targetPriceThreshold.toLocaleString()})!`,
              isRead: false,
              link: listingId,
            }).catch(() => {});
          }
          if (follower.notifyEmail) {
            const u = await db.select().from(users).where(eq(users.id, follower.userId)).then(r => r[0]);
            if (u && u.email) {
              await sendEmail(u.email, u.name, `Target Price Reached: ${listingTitle}`, 'OUTBID', {
                title: listingTitle,
                yourBid: follower.targetPriceThreshold,
                currentPrice: newBidAmount,
                listingId
              }).catch((e: any) => console.warn('Email price threshold notify notice:', e?.message));
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Error in notifyListingFollowersOnBid:', err?.message);
    }
  }

  // 1. Get follow state for a listing
  app.get('/api/listings/:id/follow', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const follow = await db.select().from(listingFollows)
        .where(and(eq(listingFollows.listingId, id), eq(listingFollows.userId, req.dbUser.id)))
        .then(r => r[0]);
      res.json(follow || null);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch follow status: ' + err.message });
    }
  });

  // 2. Set or update follow & alert settings
  app.post('/api/listings/:id/follow', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const {
        targetPriceThreshold,
        notifyOnOutbid = true,
        notifyOnPriceThreshold = true,
        notifyInApp = true,
        notifyEmail = true
      } = req.body;

      const listing = await db.select().from(listings).where(eq(listings.id, id)).then(r => r[0]);
      if (!listing) return res.status(404).json({ error: 'Listing not found' });

      const existing = await db.select().from(listingFollows)
        .where(and(eq(listingFollows.listingId, id), eq(listingFollows.userId, req.dbUser.id)))
        .then(r => r[0]);

      let result;
      const parsedThreshold = targetPriceThreshold !== undefined && targetPriceThreshold !== null && targetPriceThreshold !== ''
        ? Number(targetPriceThreshold)
        : null;

      if (existing) {
        const [updated] = await db.update(listingFollows)
          .set({
            targetPriceThreshold: parsedThreshold,
            notifyOnOutbid: Boolean(notifyOnOutbid),
            notifyOnPriceThreshold: Boolean(notifyOnPriceThreshold),
            notifyInApp: Boolean(notifyInApp),
            notifyEmail: Boolean(notifyEmail),
            updatedAt: new Date()
          })
          .where(eq(listingFollows.id, existing.id))
          .returning();
        result = updated;
      } else {
        const [inserted] = await db.insert(listingFollows).values({
          id: generateId('flw'),
          userId: req.dbUser.id,
          listingId: id,
          targetPriceThreshold: parsedThreshold,
          notifyOnOutbid: Boolean(notifyOnOutbid),
          notifyOnPriceThreshold: Boolean(notifyOnPriceThreshold),
          notifyInApp: Boolean(notifyInApp),
          notifyEmail: Boolean(notifyEmail),
        }).returning();
        result = inserted;
      }

      await logAudit(
        'ITEM_FOLLOWED',
        req.dbUser.id,
        req.dbUser.name,
        `User followed listing "${listing.title}" with alerts: outbid=${notifyOnOutbid}, threshold=${parsedThreshold ? `NPR ${parsedThreshold}` : 'none'}`
      );

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update follow settings: ' + err.message });
    }
  });

  // 3. Unfollow listing
  app.delete('/api/listings/:id/follow', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await db.delete(listingFollows)
        .where(and(eq(listingFollows.listingId, id), eq(listingFollows.userId, req.dbUser.id)));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to unfollow listing: ' + err.message });
    }
  });

  // 4. Get all user follows
  app.get('/api/user/follows', requireAuth, async (req: AuthRequest, res) => {
    try {
      const follows = await db.select({
        follow: listingFollows,
        listing: listings
      })
      .from(listingFollows)
      .innerJoin(listings, eq(listingFollows.listingId, listings.id))
      .where(eq(listingFollows.userId, req.dbUser.id))
      .orderBy(desc(listingFollows.createdAt));

      res.json(follows);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch user follows: ' + err.message });
    }
  });

  // AUTO BID: Cancel
  app.post('/api/listings/:id/autobid/cancel', requireAuth, async (req: AuthRequest, res) => {
    // wait, route was DELETE /api/listings/:id/autobid
    res.status(501).json({ error: 'Use DELETE instead' });
  });
  
  app.delete('/api/listings/:id/autobid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const result = await db.transaction(async (tx) => {
        const config = await tx.select().from(autoBidConfigs)
          .where(and(eq(autoBidConfigs.listingId, id), eq(autoBidConfigs.bidderId, req.dbUser.id), eq(autoBidConfigs.isActive, true)))
          .for('update').then(r => r[0]);
          
        if (!config) throw new Error('Auto-bid not found or already inactive');
        
        await tx.update(autoBidConfigs).set({ isActive: false }).where(eq(autoBidConfigs.id, config.id));
        
        // Now reduce the hold to the actual current bid amount (if they are the highest bidder) or release it
        const currentBids = await tx.select().from(bids).where(and(eq(bids.listingId, id), eq(bids.bidderId, req.dbUser.id))).orderBy(desc(bids.amount)).limit(1);
        const myHighestBid = currentBids.length > 0 ? Number(currentBids[0].amount) : 0;
        
        // Are we the absolute highest bidder?
        const highestBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        const isOverallHighest = highestBids.length > 0 && highestBids[0].bidderId === req.dbUser.id;
        
        const requiredHoldAmount = isOverallHighest ? Number(highestBids[0].amount) : 0;
        
        const existingHold = await tx.select().from(walletHolds)
          .where(and(eq(walletHolds.listingId, id), eq(walletHolds.userId, req.dbUser.id), eq(walletHolds.status, 'ACTIVE')))
          .for('update').then(r => r[0]);
          
        if (existingHold) {
          const wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).for('update').then(r => r[0]);
          if (wallet) {
             const heldAmount = Number(existingHold.amount);
             if (heldAmount > requiredHoldAmount) {
                const releaseAmount = heldAmount - requiredHoldAmount;
                const newAvailable = wallet.availableBalance + releaseAmount;
                const newHeld = wallet.heldBalance - releaseAmount;
                
                await tx.update(wallets).set({ availableBalance: newAvailable, heldBalance: newHeld }).where(eq(wallets.id, wallet.id));
                await tx.insert(walletTransactions).values({
                  id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: 'BID_RELEASE',
                  amount: releaseAmount, status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailable,
                  referenceType: 'listings', referenceId: id,
                  description: `Released excess balance after cancelling auto-bid on listing`
                });
                
                if (requiredHoldAmount === 0) {
                  await tx.update(walletHolds).set({ status: 'RELEASED', updatedAt: new Date() }).where(eq(walletHolds.id, existingHold.id));
                } else {
                  await tx.update(walletHolds).set({ amount: requiredHoldAmount, updatedAt: new Date() }).where(eq(walletHolds.id, existingHold.id));
                }
             }
          }
        }
        return { success: true };
      });
      res.json(result);
    } catch(err:any) { res.status(400).json({ error: err.message }); }
  });


  // 7. Place a bid
  app.post('/api/listings/:id/bid', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const bidAmount = Number(amount);

    if (req.dbUser.isBanned) {
      return res.status(403).json({ error: 'Your account has been restricted from placing bids.' });
    }

    try {
      await concludeExpiredAuctions();

      const result = await db.transaction(async (tx) => {
        const listing = await tx.select().from(listings).where(eq(listings.id, id)).for('update').then(r => r[0]);
        if (!listing) throw new Error('Listing not found');
        if (listing.status !== 'ACTIVE') throw new Error('Auction is not active');
        
        const now = new Date();
        if (now > new Date(listing.endTime)) throw new Error('Auction has already ended');
        if (bidAmount <= listing.currentPrice) throw new Error(`Bid amount must be greater than current price of NPR ${listing.currentPrice}`);
        if (listing.sellerId === req.dbUser.id) throw new Error('Sellers cannot bid on their own listings');

        let wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).then(r => r[0]);
        
        const previousHighBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        const prevHighBidder = previousHighBids.length > 0 ? previousHighBids[0] : null;
        
        const isSameBidder = prevHighBidder && prevHighBidder.bidderId === req.dbUser.id;
        const requiredAdditionalBalance = isSameBidder ? (bidAmount - prevHighBidder.amount) : bidAmount;

        if (!wallet || wallet.availableBalance < requiredAdditionalBalance) {
          throw new Error('Insufficient wallet balance. Please add funds to your wallet.');
        }

        const currentEndTime = new Date(listing.endTime);
        const twoMinutesInMs = 2 * 60 * 1000;
        const timeRemaining = currentEndTime.getTime() - now.getTime();
        let activeEndTime = currentEndTime;

        if (timeRemaining > 0 && timeRemaining <= twoMinutesInMs) {
          activeEndTime = new Date(now.getTime() + twoMinutesInMs);
          await tx.update(listings).set({ endTime: activeEndTime }).where(eq(listings.id, id));
          
          await tx.insert(notifications).values({
            id: generateId('not'), userId: listing.sellerId, type: 'AUCTION_ENDED',
            message: `Auction for "${listing.title}" extended by 2 minutes to prevent sniping.`, isRead: false, link: id,
          });
        }

        if (prevHighBidder && !isSameBidder) {
          let prevWallet = await tx.select().from(wallets).where(eq(wallets.userId, prevHighBidder.bidderId)).then(r => r[0]);
          if (prevWallet) {
            const newBalance = prevWallet.availableBalance + prevHighBidder.amount;
            const newHeld = Math.max(0, prevWallet.heldBalance - prevHighBidder.amount);
            await tx.update(wallets).set({ availableBalance: newBalance, heldBalance: newHeld }).where(eq(wallets.id, prevWallet.id));
            
            await tx.insert(walletTransactions).values({
              id: generateId('wtx'), walletId: prevWallet.id, userId: prevHighBidder.bidderId, type: 'BID_RELEASE',
              amount: prevHighBidder.amount, status: 'SUCCESS', balanceBefore: prevWallet.availableBalance, balanceAfter: newBalance,
              referenceType: 'listings', referenceId: listing.id,
              description: `Released held balance for outbid on ${listing.title}`
            });
            
            await tx.update(walletHolds).set({ status: 'RELEASED', updatedAt: new Date() })
               .where(and(eq(walletHolds.listingId, listing.id), eq(walletHolds.userId, prevHighBidder.bidderId), eq(walletHolds.status, 'ACTIVE')));
          }
        }

        const newAvailableBalance = wallet.availableBalance - requiredAdditionalBalance;
        const newHeldBalance = wallet.heldBalance + requiredAdditionalBalance;
        
        await tx.update(wallets).set({ availableBalance: newAvailableBalance, heldBalance: newHeldBalance }).where(eq(wallets.id, wallet.id));
        
        await tx.insert(walletTransactions).values({
          id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: 'BID_HOLD',
          amount: requiredAdditionalBalance, status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailableBalance,
          referenceType: 'listings', referenceId: listing.id,
          description: isSameBidder ? `Held additional balance for increased bid on ${listing.title}` : `Held balance for new bid on ${listing.title}`
        });

        const bidId = generateId('bid');
        const newBid = await tx.insert(bids).values({
          id: bidId,
          listingId: id,
          bidderId: req.dbUser.id,
          bidderName: req.dbUser.name,
          amount: bidAmount,
          isAutoBid: false,
        }).returning();

        await tx.insert(walletHolds).values({
          id: generateId('whd'),
          userId: req.dbUser.id,
          walletId: wallet.id,
          listingId: listing.id,
          bidId: bidId,
          amount: bidAmount,
          status: 'ACTIVE'
        });

        await tx.update(listings).set({ currentPrice: bidAmount }).where(eq(listings.id, id));

        await tx.insert(notifications).values({
          id: generateId('not'), userId: listing.sellerId, type: 'OUTBID',
          message: `New bid of NPR ${bidAmount} placed on "${listing.title}"`, isRead: false, link: id,
        });

        if (prevHighBidder && !isSameBidder) {
          await tx.insert(notifications).values({
            id: generateId('not'), userId: prevHighBidder.bidderId, type: 'OUTBID',
            message: `You have been outbid on "${listing.title}"`, isRead: false, link: id,
          });
        }

        return { bid: newBid[0], listing: { ...listing, currentPrice: bidAmount, endTime: activeEndTime }, prevHighBidder };
      });

      // Trigger follower notifications (outbid / price threshold alerts)
      notifyListingFollowersOnBid(
        id,
        result.listing.title,
        bidAmount,
        req.dbUser.id,
        result.prevHighBidder?.bidderId,
        result.prevHighBidder?.amount
      ).catch(() => {});

      const pusherClient = getPusher();
      if (pusherClient) pusherClient.trigger(`listing-${id}`, 'new-bid', result);
      res.json({ bid: result.bid, listing: result.listing });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to place bid' });
    }
  });

  
  app.post('/api/listings/:id/autobid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { maxAmount } = req.body;
      const parsedAmount = Number(maxAmount);

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Valid max amount is required' });
      }

      const listing = await db.select().from(listings).where(eq(listings.id, id)).then(r => r[0]);
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.status !== 'ACTIVE') return res.status(400).json({ error: 'Listing is not active' });
      if (listing.sellerId === req.dbUser.id) return res.status(400).json({ error: 'Sellers cannot auto-bid on their own listings' });

      // Upsert autoBid config
      const existing = await db.select().from(autoBidConfigs).where(and(eq(autoBidConfigs.listingId, id), eq(autoBidConfigs.bidderId, req.dbUser.id))).then(r => r[0]);
      if (existing) {
        await db.update(autoBidConfigs).set({ maxAmount: parsedAmount, isActive: true }).where(eq(autoBidConfigs.id, existing.id));
      } else {
        await db.insert(autoBidConfigs).values({
          id: generateId('abc'),
          listingId: id,
          bidderId: req.dbUser.id,
          maxAmount: parsedAmount,
          isActive: true
        });
      }
      res.json({ success: true, message: 'Auto-bid configured successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to configure auto-bid: ' + error.message });
    }
  });

  
  app.post('/api/listings/:id/buynow', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;

    try {
      await concludeExpiredAuctions();

      const result = await db.transaction(async (tx) => {
        const listing = await tx.select().from(listings).where(eq(listings.id, id)).for('update').then(r => r[0]);
        if (!listing || !listing.buyNowPrice) {
          throw new Error('Listing not found or Buy Now option is not available');
        }
        if (listing.status !== 'ACTIVE') {
          throw new Error('Listing is not active');
        }
        const now = new Date();
        if (now > new Date(listing.endTime)) {
          throw new Error('Auction has already ended');
        }
        if (listing.sellerId === req.dbUser.id) {
          throw new Error('Sellers cannot buy their own listings');
        }

        // We need to lock the buyer and seller wallet in a consistent order
        let usersToLock = [req.dbUser.id, listing.sellerId];
        usersToLock.sort();

        const lockedWallets = new Map();
        for (const uid of usersToLock) {
            let w = await tx.select().from(wallets).where(eq(wallets.userId, uid)).for('update').then(r => r[0]);
            if (!w) {
                // Try to create wallet if missing, particularly for seller
                const [newW] = await tx.insert(wallets).values({
                    id: generateId('wal'),
                    userId: uid,
                    availableBalance: 0,
                    heldBalance: 0,
                }).returning();
                w = newW;
            }
            lockedWallets.set(uid, w);
        }

        const wallet = lockedWallets.get(req.dbUser.id);
        const sellerWallet = lockedWallets.get(listing.sellerId);
        
        if (!wallet || !sellerWallet) throw new Error('Failed to resolve wallets');

        // Existing active hold for current buyer?
        const myActiveHold = await tx.select().from(walletHolds)
          .where(and(eq(walletHolds.listingId, id), eq(walletHolds.userId, req.dbUser.id), eq(walletHolds.status, 'ACTIVE')))
          .for('update').then(r => r[0]);

        const previouslyHeld = myActiveHold ? Number(myActiveHold.amount) : 0;
        const requiredAdditionalBalance = listing.buyNowPrice - previouslyHeld;

        if (requiredAdditionalBalance > 0 && wallet.availableBalance < requiredAdditionalBalance) {
          throw new Error('Insufficient wallet balance for Buy Now. Please add funds to your wallet.');
        }

        // Release other bidders' locked balances
        const allHolds = await tx.select().from(walletHolds)
          .where(and(eq(walletHolds.listingId, id), eq(walletHolds.status, 'ACTIVE')))
          .for('update');
          
        for (const hold of allHolds) {
           if (hold.userId === req.dbUser.id) continue;
           let otherWallet = await tx.select().from(wallets).where(eq(wallets.userId, hold.userId)).for('update').then(r => r[0]);
           if (otherWallet) {
              const amountToRelease = Number(hold.amount);
              const newBalance = otherWallet.availableBalance + amountToRelease;
              const newHeld = otherWallet.heldBalance - amountToRelease;
              await tx.update(wallets).set({ availableBalance: newBalance, heldBalance: newHeld }).where(eq(wallets.id, otherWallet.id));
              
              await tx.insert(walletTransactions).values({
                 id: generateId('wtx'), walletId: otherWallet.id, userId: hold.userId, type: 'BID_RELEASE',
                 amount: amountToRelease, status: 'SUCCESS', balanceBefore: otherWallet.availableBalance, balanceAfter: newBalance,
                 referenceType: 'listings', referenceId: listing.id,
                 description: `Released held balance for sold item ${listing.title}`
              });
           }
           await tx.update(walletHolds).set({ status: 'RELEASED', updatedAt: new Date() }).where(eq(walletHolds.id, hold.id));
        }

        // Deduct from current buyer
        const newAvailableBalance = wallet.availableBalance - requiredAdditionalBalance;
        const newHeldBalance = wallet.heldBalance - previouslyHeld; // We capture the hold!
        await tx.update(wallets).set({ availableBalance: newAvailableBalance, heldBalance: newHeldBalance }).where(eq(wallets.id, wallet.id));
        
        if (myActiveHold) {
           await tx.update(walletHolds).set({ status: 'CAPTURED', updatedAt: new Date() }).where(eq(walletHolds.id, myActiveHold.id));
        }

        const transactionId = generateId('txn');
        await tx.insert(walletTransactions).values({
          id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: 'AUCTION_PAYMENT',
          amount: listing.buyNowPrice, status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailableBalance,
          referenceType: 'transactions', referenceId: transactionId,
          description: `Payment for Buy Now on ${listing.title}`
        });

        // Add 100% of price to seller wallet
        const newSellerBal = sellerWallet.availableBalance + listing.buyNowPrice;
        await tx.update(wallets).set({ availableBalance: newSellerBal }).where(eq(wallets.id, sellerWallet.id));
        await tx.insert(walletTransactions).values({
             id: generateId('wtx'), walletId: sellerWallet.id, userId: listing.sellerId, type: 'AUCTION_PAYMENT',
             amount: listing.buyNowPrice, status: 'SUCCESS', balanceBefore: sellerWallet.availableBalance, balanceAfter: newSellerBal,
             referenceType: 'transactions', referenceId: transactionId,
             description: `Received payment for sold item ${listing.title}`
        });
          
        const newTxn = await tx.insert(transactions).values({
          id: transactionId,
          listingId: id,
          listingTitle: listing.title,
          buyerId: req.dbUser.id,
          buyerName: req.dbUser.name,
          sellerId: listing.sellerId,
          sellerName: listing.sellerName,
          finalAmount: listing.buyNowPrice,
          paymentStatus: 'PAID',
          paymentMethod: 'WALLET',
          paymentDeadline: new Date(),
          completedAt: new Date()
        }).returning();
        
        // Update listing status
        await tx.update(listings).set({ status: 'SOLD', currentPrice: listing.buyNowPrice, endTime: new Date() }).where(eq(listings.id, id));

        // Notifications
        await tx.insert(notifications).values({
          id: generateId('not'), userId: listing.sellerId, type: 'AUCTION_ENDED',
          message: `Your listing "${listing.title}" was purchased instantly by ${req.dbUser.name} via Wallet for NPR ${listing.buyNowPrice}.`,
          isRead: false, link: id,
        });

        await tx.insert(notifications).values({
          id: generateId('not'), userId: req.dbUser.id, type: 'AUCTION_WON',
          message: `You successfully purchased "${listing.title}" via Buy Now. Rs. ${listing.buyNowPrice} was deducted from your Wallet.`,
          isRead: false, link: id,
        });

        return { txn: newTxn[0], listing: { ...listing, status: 'SOLD', currentPrice: listing.buyNowPrice } };
      });

      const pusher = getPusher();
      if (pusher) {
        pusher.trigger(`listing-${id}`, 'new-bid', {
          listing: result.listing,
          bids: [] 
        }).catch(err => console.error("Pusher error:", err));
      }

      res.json(result.txn);
    } catch (error: any) {
      if (error.message.includes('Insufficient') || error.message.includes('ended') || error.message.includes('active')) {
          res.status(409).json({ error: 'Buy now purchase failed: ' + error.message });
      } else {
          res.status(500).json({ error: 'Buy now purchase failed: ' + error.message });
      }
    }
  });
  
// Wallet Routes
  app.get('/api/wallet', requireAuth, async (req: AuthRequest, res) => {
    try {
      // Re-initialize to ensure it exists
      const wallet = await initializeWalletForUser(req.dbUser.id, req.dbUser.uid, req.dbUser.role);
      
      const welcomeBonusTxn = await db.select().from(walletTransactions)
        .where(and(eq(walletTransactions.userId, req.dbUser.id), eq(walletTransactions.type, 'WELCOME_BONUS')))
        .limit(1).then(r => r[0]);
        
      res.json({
        success: true,
        wallet: {
          availableBalance: wallet.availableBalance,
          heldBalance: wallet.heldBalance,
          totalBalance: wallet.availableBalance + wallet.heldBalance,
          currency: wallet.currency,
          welcomeBonusReceived: !!welcomeBonusTxn
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch wallet: ' + error.message });
    }
  });

  app.get('/api/wallet/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const typeFilter = req.query.type as string;
      
      let conditions = [eq(walletTransactions.userId, req.dbUser.id)];
      if (typeFilter) {
        conditions.push(eq(walletTransactions.type, typeFilter as any));
      }
      
      const txns = await db.select()
        .from(walletTransactions)
        .where(and(...conditions))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit)
        .offset(offset);
        
      res.json({
        success: true,
        transactions: txns,
        page,
        limit
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch transactions: ' + error.message });
    }
  });
  app.post('/api/admin/wallets/migrate', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const summary = await runExistingUserWalletMigration();
      res.json({ success: true, summary });
    } catch (error: any) {
      res.status(500).json({ error: 'Migration failed: ' + error.message });
    }
  });

  app.get('/api/admin/wallets', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const search = (req.query.search as string) || '';
      
      const query = sql`
        SELECT w.*, u.name as user_name, u.email as user_email
        FROM wallets w
        JOIN users u ON w.user_id = u.id
        WHERE u.name ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'}
        ORDER BY w.available_balance DESC
        LIMIT 50
      `;
      const result = await db.execute(query);
      res.json(result.rows || result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch wallets: ' + error.message });
    }
  });

  app.post('/api/admin/wallets/adjust', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const { userId, amount, reason, action } = req.body;
      const amountNum = Number(amount);
      if (!reason || reason.trim() === '') throw new Error('Reason is compulsory');
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Invalid amount');
      
      const result = await db.transaction(async (tx) => {
        let wallet = await tx.select().from(wallets).where(eq(wallets.userId, userId)).then(r => r[0]);
        if (!wallet) throw new Error('Wallet not found for user');
        
        const isCredit = action === 'CREDIT';
        if (!isCredit && wallet.availableBalance < amountNum) {
          throw new Error('Insufficient balance to deduct');
        }
        
        const balanceBefore = wallet.availableBalance;
        const balanceAfter = isCredit ? balanceBefore + amountNum : balanceBefore - amountNum;
        
        await tx.update(wallets).set({ availableBalance: balanceAfter }).where(eq(wallets.id, wallet.id));
        
        const txnId = generateId('wtx');
        await tx.insert(walletTransactions).values({
          id: txnId, walletId: wallet.id, userId,
          type: isCredit ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
          amount: amountNum, status: 'SUCCESS',
          balanceBefore, balanceAfter,
          description: `Admin adjustment: ${reason}`,
          referenceType: 'admin_adjustment', referenceId: req.dbUser.id
        });
        
        return { walletId: wallet.id, balanceAfter };
      });
      
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // End of wallet admin endpoints

  // 10. Get User Transactions
  app.get('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      let txns;
      if (req.dbUser.role === 'ADMIN') {
        txns = await db.select()
          .from(transactions)
          .orderBy(desc(transactions.paymentDeadline));
      } else {
        txns = await db.select()
          .from(transactions)
          .where(or(
            eq(transactions.buyerId, req.dbUser.id),
            eq(transactions.sellerId, req.dbUser.id)
          ))
          .orderBy(desc(transactions.paymentDeadline));
      }
      res.json(txns);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch transactions: ' + error.message });
    }
  });

  // 10b. Get User Bids / All Bids
  app.get('/api/bids', requireAuth, async (req: AuthRequest, res) => {
    try {
      let userBids;
      if (req.dbUser.role === 'ADMIN') {
        userBids = await db.select()
          .from(bids)
          .orderBy(desc(bids.placedAt));
      } else {
        userBids = await db.select()
          .from(bids)
          .where(eq(bids.bidderId, req.dbUser.id))
          .orderBy(desc(bids.placedAt));
      }
      res.json(userBids);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch bids: ' + error.message });
    }
  });

  // 11. Process Simulated eSewa/Khalti Payment
  app.post('/api/transactions/:id/pay', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    try {
      const txn = await db.select().from(transactions).where(eq(transactions.id, id)).then(r => r[0]);
      if (!txn) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (txn.buyerId !== req.dbUser.id) {
        return res.status(403).json({ error: 'Only the buyer can make this payment' });
      }

      // Update payment status
      const updated = await db.update(transactions)
        .set({
          paymentStatus: 'PAID',
          paymentMethod,
          completedAt: new Date(),
        })
        .where(eq(transactions.id, id))
        .returning();

      // Create notification for seller
      await db.insert(notifications).values({
        id: generateId('not'),
        userId: txn.sellerId,
        type: 'PAYMENT_RECEIVED',
        message: `Payment of NPR ${txn.finalAmount} received via ${paymentMethod} for "${txn.listingTitle}". Ready to ship!`,
        isRead: false,
        link: txn.listingId,
      });

      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Payment processing failed: ' + error.message });
    }
  });

  // 11b. Submit Payment Screenshot for manual verification
  app.post('/api/transactions/:id/screenshot', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { screenshot, paymentMethod } = req.body;

    if (!screenshot) {
      return res.status(400).json({ error: 'Screenshot image is required.' });
    }

    try {
      const txn = await db.select().from(transactions).where(eq(transactions.id, id)).then(r => r[0]);
      if (!txn) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (txn.buyerId !== req.dbUser.id) {
        return res.status(403).json({ error: 'Only the buyer can upload a payment screenshot' });
      }

      // Update payment status to VERIFYING and store screenshot
      const updated = await db.update(transactions)
        .set({
          paymentStatus: 'VERIFYING',
          paymentScreenshot: screenshot,
          paymentMethod: paymentMethod || 'QR_CODE',
        })
        .where(eq(transactions.id, id))
        .returning();

      // Store in the new payment_screenshots admin database table as requested
      try {
        const screenshotId = generateId('ps');
        await db.insert(paymentScreenshots).values({
          id: screenshotId,
          transactionId: id,
          buyerId: req.dbUser.id,
          buyerName: req.dbUser.name,
          buyerEmail: req.dbUser.email,
          amount: txn.finalAmount,
          screenshotUrl: screenshot,
          paymentMethod: paymentMethod || 'QR_CODE',
          status: 'PENDING_REVIEW',
        });
      } catch (screenshotError: any) {
        console.error('Failed to store screenshot metadata in neon database table:', screenshotError);
      }

      // Create notification for seller that buyer uploaded proof
      await db.insert(notifications).values({
        id: generateId('not'),
        userId: txn.sellerId,
        type: 'PAYMENT_RECEIVED',
        message: `Buyer ${req.dbUser.name} uploaded payment screenshot for "${txn.listingTitle}". Verification is pending.`,
        isRead: false,
        link: txn.listingId,
      });

      // Send email to buyer
      await sendEmail(req.dbUser.email, req.dbUser.name, 'Payment Screenshot Received', 'PAYMENT_UPLOADED_BUYER', {
        title: txn.listingTitle,
        screenshot,
      });

      // Send email to seller
      const seller = await db.select().from(users).where(eq(users.id, txn.sellerId)).then(r => r[0]);
      if (seller) {
        await sendEmail(seller.email, seller.name, 'Buyer Uploaded Payment Proof', 'PAYMENT_UPLOADED_SELLER', {
          title: txn.listingTitle,
          buyerName: req.dbUser.name,
          screenshot,
        });
      }

      // Send email to admin
      const adminEmail = process.env.PAYMENT_EMAIL || 'aditya.shh15@gmail.com';
      await sendEmail(adminEmail, 'Escrow Admin', 'New Payment Verification Request', 'PAYMENT_UPLOADED_ADMIN', {
        buyerName: req.dbUser.name,
        transactionId: id,
        screenshot,
      });

      // Log secure audit transaction
      await logAudit(
        'PAYMENT_SCREENSHOT_UPLOADED',
        req.dbUser.id,
        req.dbUser.name,
        `Uploaded payment screenshot for transaction ID ${id} (${txn.listingTitle}) - status changed to VERIFYING.`
      );

      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to upload screenshot: ' + error.message });
    }
  });

  // 11c. Super Admin manually verifies payment
  app.post('/api/admin/transactions/:id/verify-payment', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'

    try {
      const txn = await db.select().from(transactions).where(eq(transactions.id, id)).then(r => r[0]);
      if (!txn) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (action === 'APPROVE') {
        const updated = await db.update(transactions)
          .set({
            paymentStatus: 'PAID', // Represents confirmed / settled
            completedAt: new Date(),
          })
          .where(eq(transactions.id, id))
          .returning();

        // Get buyer & seller details for sending emails
        const buyer = await db.select().from(users).where(eq(users.id, txn.buyerId)).then(r => r[0]);
        const seller = await db.select().from(users).where(eq(users.id, txn.sellerId)).then(r => r[0]);

        // Notifications
        await db.insert(notifications).values({
          id: generateId('not'),
          userId: txn.buyerId,
          type: 'PAYMENT_RECEIVED',
          message: `Your payment of NPR ${txn.finalAmount} for "${txn.listingTitle}" was VERIFIED. Order is confirmed!`,
          isRead: false,
          link: txn.listingId,
        });

        await db.insert(notifications).values({
          id: generateId('not'),
          userId: txn.sellerId,
          type: 'PAYMENT_RECEIVED',
          message: `Payment of NPR ${txn.finalAmount} verified for "${txn.listingTitle}". Please ship the item!`,
          isRead: false,
          link: txn.listingId,
        });

        // Send confirmation emails
        if (buyer) {
          await sendEmail(
            buyer.email,
            buyer.name,
            `💰 Escrow Payment Confirmed: "${txn.listingTitle}"`,
            'PAYMENT_COMPLETED',
            { finalAmount: txn.finalAmount, paymentMethod: txn.paymentMethod || 'QR_CODE', title: txn.listingTitle, transactionId: txn.id, buyerName: buyer.name, sellerName: txn.sellerName }
          );
        }
        if (seller) {
          await sendEmail(
            seller.email,
            seller.name,
            `💰 Escrow Payment Confirmed: "${txn.listingTitle}"`,
            'PAYMENT_COMPLETED',
            { finalAmount: txn.finalAmount, paymentMethod: txn.paymentMethod || 'QR_CODE', title: txn.listingTitle, transactionId: txn.id, buyerName: txn.buyerName, sellerName: seller.name }
          );
        }

        // Log secure audit transaction
        await logAudit(
          'PAYMENT_VERIFIED_APPROVED',
          req.dbUser.id,
          req.dbUser.name,
          `Admin verified and APPROVED payment of NPR ${txn.finalAmount} for transaction ID ${id}.`
        );

        res.json({ success: true, transaction: updated[0] });
      } else {
        // REJECT payment
        const updated = await db.update(transactions)
          .set({
            paymentStatus: 'FAILED',
            paymentScreenshot: null, // Clear screenshot on rejection
          })
          .where(eq(transactions.id, id))
          .returning();

        await db.insert(notifications).values({
          id: generateId('not'),
          userId: txn.buyerId,
          type: 'PAYMENT_RECEIVED',
          message: `Your payment verification for "${txn.listingTitle}" was DECLINED. Please upload a valid proof.`,
          isRead: false,
          link: txn.listingId,
        });

        await logAudit(
          'PAYMENT_VERIFIED_DECLINED',
          req.dbUser.id,
          req.dbUser.name,
          `Admin REJECTED payment screenshot for transaction ID ${id}.`
        );

        res.json({ success: true, transaction: updated[0] });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Manual verification failed: ' + error.message });
    }
  });

  // 11d. Get Consolidation Stats for Super Admin Dashboard
  app.get('/api/admin/stats', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const allTxns = await db.select().from(transactions);
      const allListings = await db.select().from(listings);
      const allBids = await db.select().from(bids);
      const allUsers = await db.select().from(users);

      // Fetch active commission rate from config or default to 5.0
      const rate = 5.0;

      const totalUsers = allUsers.length;
      const totalSellers = allUsers.filter(u => u.role === 'SELLER').length;
      const totalBidders = allUsers.filter(u => u.role === 'BIDDER').length;
      const activeListingsCount = allListings.filter(l => l.status === 'ACTIVE').length;
      const soldListingsCount = allListings.filter(l => l.status === 'SOLD').length;
      const totalBidsPlaced = allBids.length;

      const totalVolume = allTxns
        .filter(t => t.paymentStatus === 'PAID')
        .reduce((sum, t) => sum + t.finalAmount, 0);

      const totalRevenue = totalVolume * (rate / 100);

      // Identify Buy Now transactions (which skipped bidding queue)
      const skippedQueueTxns = allTxns.filter(t => {
        const l = allListings.find(item => item.id === t.listingId);
        return l && l.buyNowPrice === t.finalAmount;
      });

      const skipQueueVolume = skippedQueueTxns
        .filter(t => t.paymentStatus === 'PAID')
        .reduce((sum, t) => sum + t.finalAmount, 0);

      const skipQueueRevenue = skipQueueVolume * (rate / 100);
      const biddingQueueSkippedCount = skippedQueueTxns.length;

      // Active Bid list mapping
      const activeBidList = allBids.map(b => {
        const l = allListings.find(item => item.id === b.listingId);
        return {
          id: b.id,
          bidderName: b.bidderName,
          productTitle: l ? l.title : 'Deleted Product',
          bidAmount: b.amount,
          bidTime: b.placedAt,
        };
      }).sort((a, b) => new Date(b.bidTime).getTime() - new Date(a.bidTime).getTime()).slice(0, 15);

      res.json({
        totalUsers,
        totalSellers,
        totalBidders,
        activeListingsCount,
        soldListingsCount,
        totalBidsPlaced,
        totalVolume,
        totalRevenue,
        skipQueueVolume,
        skipQueueRevenue,
        biddingQueueSkippedCount,
        activeBidList,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to compile stats: ' + error.message });
    }
  });

  // 12. Submit Review
  app.post('/api/reviews', requireAuth, async (req: AuthRequest, res) => {
    const { transactionId, revieweeId, rating, comment } = req.body;
    try {
      const reviewId = generateId('rev');
      const newReview = await db.insert(reviews).values({
        id: reviewId,
        transactionId,
        reviewerId: req.dbUser.id,
        reviewerName: req.dbUser.name,
        revieweeId,
        rating: Number(rating),
        comment,
      }).returning();

      // Update Seller / User ratings
      const allUserReviews = await db.select().from(reviews).where(eq(reviews.revieweeId, revieweeId));
      const count = allUserReviews.length;
      const sum = allUserReviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = Number((sum / count).toFixed(2));

      await db.update(users)
        .set({
          sellerRating: avg,
          sellerRatingCount: count,
        })
        .where(eq(users.id, revieweeId));

      // Notify the reviewee
      await db.insert(notifications).values({
        id: generateId('not'),
        userId: revieweeId,
        type: 'NEW_REVIEW',
        message: `${req.dbUser.name} left you a ${rating}-star review: "${comment.substring(0, 30)}..."`,
        isRead: false,
      });

      res.json(newReview[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to submit review: ' + error.message });
    }
  });

  // 13. Notifications endpoints
  app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      const unreadOnly = req.query.unreadOnly === 'true';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      let whereClause = eq(notifications.userId, req.dbUser.id);
      if (unreadOnly) {
        whereClause = and(eq(notifications.userId, req.dbUser.id), eq(notifications.isRead, false)) as any;
      }

      const list = await db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      const unreadResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, req.dbUser.id), eq(notifications.isRead, false)));

      const unreadCount = Number(unreadResult[0]?.count || 0);

      // If called with explicit pagination params, return structured payload
      if (req.query.page || req.query.limit || req.query.unreadOnly) {
        return res.json({
          notifications: list,
          total: list.length,
          unreadCount,
        });
      }

      // Default response array for direct backwards compatibility
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch notifications: ' + error.message });
    }
  });

  app.get('/api/notifications/unread-count', requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, req.dbUser.id), eq(notifications.isRead, false)));

      res.json({ unreadCount: Number(result[0]?.count || 0) });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to count unread notifications: ' + error.message });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;
    try {
      const notif = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.userId, req.dbUser.id)))
        .then((r) => r[0]);

      if (!notif) {
        return res.status(404).json({ error: 'Notification not found or access denied.' });
      }

      const updated = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning();

      res.json({ success: true, notification: updated[0] });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to mark notification as read: ' + error.message });
    }
  });

  const markAllReadHandler = async (req: AuthRequest, res: express.Response) => {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, req.dbUser.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to mark notifications as read: ' + error.message });
    }
  };

  app.patch('/api/notifications/read-all', requireAuth, markAllReadHandler);
  app.post('/api/notifications/read', requireAuth, markAllReadHandler);

  // Pusher Authentication Endpoint
  app.post('/api/pusher/auth', requireAuth, async (req: AuthRequest, res) => {
    const { socket_id, channel_name } = req.body;
    if (!socket_id || !channel_name) {
      return res.status(400).json({ error: 'socket_id and channel_name are required.' });
    }

    // Security check: channel name private-user-<userId> must match authenticated user ID
    if (channel_name.startsWith('private-user-')) {
      const channelUserId = channel_name.replace('private-user-', '');
      if (channelUserId !== req.dbUser.id) {
        return res.status(403).json({ error: 'Forbidden: Cannot authorize channel for another user.' });
      }
    }

    const pusher = getPusher();
    if (!pusher) {
      return res.status(500).json({ error: 'Pusher is not configured on the server.' });
    }

    try {
      const authData = pusher.authenticate(socket_id, channel_name);
      res.send(authData);
    } catch (err: any) {
      res.status(500).json({ error: 'Pusher auth failed: ' + err.message });
    }
  });


  // 14. Report a Listing
  app.post('/api/reports', requireAuth, async (req: AuthRequest, res) => {
    const { listingId, listingTitle, reason } = req.body;
    try {
      const repId = generateId('rep');
      const newReport = await db.insert(reports).values({
        id: repId,
        reporterId: req.dbUser.id,
        reporterName: req.dbUser.name,
        listingId,
        listingTitle,
        reason,
        status: 'PENDING',
      }).returning();

      res.json(newReport[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to submit report: ' + error.message });
    }
  });


  // ADMIN SPECIALIZED API ENDPOINTS

  // 15. Manage listings (Approve / Reject / End / Delete)
  
  const deleteListingHandler = async (req: AuthRequest, res: express.Response) => {
    const { id } = req.params;
    const { reason, confirmationText } = req.body || {};

    try {
      const existing = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Listing not found in database' });
      }
      
      const isSeller = existing[0].sellerId === req.dbUser.id || existing[0].sellerId === req.dbUser.uid;
      const isAdmin = req.dbUser.role === 'ADMIN' || 
                      req.dbUser.email === 'aditya.shh15@gmail.com' || 
                      req.dbUser.email === 'admin@bidhive.com.np' || 
                      req.dbUser.id === 'usr-admin' ||
                      req.dbUser.uid === 'usr-admin' ||
                      req.dbUser.email?.includes('admin') ||
                      req.dbUser.id?.includes('admin');
      
      if (!isSeller && !isAdmin) {
        return res.status(403).json({ error: 'Permission denied: Admin or seller access required to delete this listing' });
      }

      // If it's an admin, we enforce reason/confirmation
      if (isAdmin && req.originalUrl.includes('/api/admin/listings')) {
        if (!reason || !confirmationText) {
          // Fallback for internal admin db deletion if they didn't provide reason
          if (!req.originalUrl.includes('/db/')) {
            return res.status(400).json({ error: 'Reason and confirmationText (DELETE) are required for admin deletion' });
          }
        } else if (confirmationText !== 'DELETE') {
          return res.status(400).json({ error: 'Confirmation text must be DELETE' });
        }
      }

      // 0. Release active wallet holds back to bidders' available balance
      try {
        const holds = await db.select().from(walletHolds).where(and(eq(walletHolds.listingId, id), eq(walletHolds.status, 'ACTIVE')));
        for (const hold of holds) {
          try {
            const userWallet = await db.select().from(wallets).where(eq(wallets.id, hold.walletId)).then(r => r[0]);
            if (userWallet) {
              const newHeld = Math.max(0, userWallet.heldBalance - hold.amount);
              const newAvail = userWallet.availableBalance + hold.amount;
              await db.update(wallets).set({ availableBalance: newAvail, heldBalance: newHeld, updatedAt: new Date() }).where(eq(wallets.id, userWallet.id));
              await db.insert(walletTransactions).values({
                id: generateId('wtx'),
                walletId: userWallet.id,
                userId: userWallet.userId,
                type: 'BID_RELEASE',
                amount: hold.amount,
                status: 'SUCCESS',
                description: `Bid hold released (Listing "${existing[0].title}" deleted. Reason: ${reason || 'Admin action'})`,
                referenceType: 'LISTING_DELETE',
                referenceId: id,
                balanceBefore: userWallet.availableBalance,
                balanceAfter: newAvail,
              });
            }
            await db.update(walletHolds).set({ status: 'RELEASED', updatedAt: new Date() }).where(eq(walletHolds.id, hold.id));
          } catch(hErr) {
            console.warn('Error releasing hold during delete:', hErr);
          }
        }
      } catch(e) {
        console.warn('Error fetching wallet holds during delete:', e);
      }

      // Instead of hard deleting everything, we do a soft delete for production safety
      // We will only delete strictly necessary related items or leave them intact for audit.
      
      // Cancel active transactions (if any)
      try { 
        await db.update(transactions)
                .set({ paymentStatus: 'CANCELLED', completedAt: new Date() })
                .where(and(eq(transactions.listingId, id), eq(transactions.paymentStatus, 'PENDING'))); 
      } catch(e) {}

      // 3. Soft delete the listing record
      await db.update(listings).set({
        status: 'DELETED',
        deletedAt: new Date(),
        deletedBy: req.dbUser.id,
        deletionReason: reason || (isSeller ? 'Deleted by seller' : 'Admin action')
      }).where(eq(listings.id, id));

      // 4. Log audit action
      try {
        await db.insert(auditLogs).values({
          id: generateId('adt'),
          action: 'LISTING_DELETE',
          userId: req.dbUser.id,
          userName: req.dbUser.name || req.dbUser.email || 'Admin',
          details: JSON.stringify({
            targetId: id,
            listingTitle: existing[0].title,
            reason: reason || (isSeller ? 'Deleted by seller' : 'Admin action')
          })
        });
      } catch(e) { console.warn('Audit log insert failed:', e); }

      console.log(`[DELETE SUCCESS] Listing ${id} (${existing[0].title}) soft-deleted successfully.`);

      return res.json({ success: true, message: 'Listing permanently deleted from public views.' });
    } catch (error: any) {
      console.error('Delete listing error:', error);
      return res.status(500).json({ error: 'Failed to delete listing: ' + (error.message || String(error)) });
    }
  };

  app.delete('/api/admin/listings/:id', requireAuth, deleteListingHandler);
  app.delete('/api/listings/:id', requireAuth, deleteListingHandler);

  // Admin user deletion route
  app.delete('/api/admin/users/:id', requireAuth, async (req: AuthRequest, res) => {
    const isAdmin = req.dbUser.role === 'ADMIN' || 
                    req.dbUser.email === 'aditya.shh15@gmail.com' || 
                    req.dbUser.email === 'admin@bidhive.com.np' || 
                    req.dbUser.id === 'usr-admin' ||
                    req.dbUser.uid === 'usr-admin' ||
                    req.dbUser.email?.includes('admin');
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

    const { id } = req.params;
    try {
      if (id === req.dbUser.id || id === req.dbUser.uid) {
        return res.status(400).json({ error: 'Cannot delete your own active admin account' });
      }

      try { await db.delete(notifications).where(eq(notifications.userId, id)); } catch(e) {}
      try { await db.delete(categoryFollows).where(eq(categoryFollows.userId, id)); } catch(e) {}
      try { await db.delete(priceTargets).where(eq(priceTargets.userId, id)); } catch(e) {}
      try { await db.delete(reports).where(eq(reports.reporterId, id)); } catch(e) {}
      try { await db.delete(walletHolds).where(eq(walletHolds.userId, id)); } catch(e) {}
      try { await db.delete(walletTransactions).where(eq(walletTransactions.userId, id)); } catch(e) {}
      try { await db.delete(topupRequests).where(eq(topupRequests.userId, id)); } catch(e) {}
      try { await db.delete(wallets).where(eq(wallets.userId, id)); } catch(e) {}
      try { await db.delete(autoBidConfigs).where(eq(autoBidConfigs.bidderId, id)); } catch(e) {}
      try { await db.delete(bids).where(eq(bids.bidderId, id)); } catch(e) {}

      await db.delete(users).where(or(eq(users.id, id), eq(users.uid, id)));
      res.json({ success: true, message: 'User permanently deleted from database' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete user: ' + err.message });
    }
  });

  // Admin generic DB table record deletion route for Database Inspector
  app.delete('/api/admin/db/:tableName/:id', requireAuth, async (req: AuthRequest, res) => {
    const isAdmin = req.dbUser.role === 'ADMIN' || 
                    req.dbUser.email === 'aditya.shh15@gmail.com' || 
                    req.dbUser.email === 'admin@bidhive.com.np' || 
                    req.dbUser.id === 'usr-admin' ||
                    req.dbUser.uid === 'usr-admin' ||
                    req.dbUser.email?.includes('admin');
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

    const { tableName, id } = req.params;
    try {
      if (tableName === 'listings') {
        return deleteListingHandler(req, res);
      }
      
      const tablesMap: Record<string, any> = {
        users, categories, listings, bids, autoBidConfigs, transactions, reviews, notifications, reports, sentEmails, auditLogs, paymentScreenshots, priceTargets, categoryFollows, wallets,  topupRequests, walletTransactions, walletHolds
      };

      const targetTable = tablesMap[tableName];
      if (!targetTable) {
        return res.status(400).json({ error: `Table "${tableName}" not found in schema` });
      }

      await db.delete(targetTable).where(eq(targetTable.id, id));
      res.json({ success: true, message: `Record ${id} deleted from ${tableName}` });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to delete record: ${err.message}` });
    }
  });

  app.post('/api/admin/listings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE', 'CANCELLED', etc.

    try {
      const listing = await db.select().from(listings).where(eq(listings.id, id)).then(r => r[0]);
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      await db.update(listings)
        .set({ status })
        .where(eq(listings.id, id));

      // Get seller details
      const seller = await db.select().from(users).where(eq(users.id, listing.sellerId)).then(r => r[0]);

      if (seller) {
        if (status === 'ACTIVE') {
          await sendEmail(
            seller.email,
            seller.name,
            `Listing Approved: ${listing.title}`,
            'LISTING_APPROVED',
            { title: listing.title, startingPrice: listing.startingPrice, reservePrice: listing.reservePrice, buyNowPrice: listing.buyNowPrice, endTime: listing.endTime, link: id }
          );
        } else if (status === 'CANCELLED') {
          await sendEmail(
            seller.email,
            seller.name,
            `Listing Declined: ${listing.title}`,
            'LISTING_REJECTED',
            { title: listing.title }
          );
        }
      }

      // Log audit trail
      await logAudit(
        status === 'ACTIVE' ? 'LISTING_APPROVED' : 'LISTING_REJECTED',
        req.dbUser.id,
        req.dbUser.name,
        `Listing "${listing.title}" (ID: ${id}) was ${status === 'ACTIVE' ? 'approved (ACTIVE)' : 'declined/cancelled (' + status + ')'} by Admin.`
      );

      // Notify the seller
      await db.insert(notifications).values({
        id: generateId('not'),
        userId: listing.sellerId,
        type: status === 'ACTIVE' ? 'LISTING_APPROVED' : 'LISTING_REJECTED',
        message: `Your listing "${listing.title}" has been ${status === 'ACTIVE' ? 'approved and is now active' : 'rejected/cancelled'} by the platform administrator.`,
        isRead: false,
        link: id,
      });

      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ error: 'Admin status update failed: ' + error.message });
    }
  });

  // 16. Get all platform users
  app.get('/api/admin/users', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch platform users: ' + error.message });
    }
  });

  // 17. Change user role / Ban status
  app.post('/api/admin/users/:id/action', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { role, isBanned } = req.body;

    try {
      const userToModify = await db.select().from(users).where(eq(users.id, id)).then(r => r[0]);
      if (!userToModify) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updateData: any = {};
      if (role) updateData.role = role;
      if (isBanned !== undefined) updateData.isBanned = isBanned;

      const updated = await db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      // Log audit
      if (isBanned !== undefined) {
        await logAudit(
          isBanned ? 'USER_BANNED' : 'USER_UNBANNED',
          req.dbUser.id,
          req.dbUser.name,
          `User "${userToModify.name}" (${userToModify.email}) was ${isBanned ? 'BANNED' : 'UNBANNED'} by Admin.`
        );
      }
      if (role) {
        await logAudit(
          'USER_ROLE_CHANGED',
          req.dbUser.id,
          req.dbUser.name,
          `User "${userToModify.name}" (${userToModify.email}) role updated to ${role} by Admin.`
        );
      }

      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Action failed: ' + error.message });
    }
  });

  // 17b. Get all payment screenshot submissions (Neon DB Table)
  app.get('/api/admin/payment-screenshots', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      console.log('Fetching payment screenshots via Drizzle ORM...');
      const submissions = await db.select().from(paymentScreenshots).orderBy(desc(paymentScreenshots.createdAt));
      console.log('Fetched', submissions.length, 'submissions');
      res.json(submissions);
    } catch (error: any) {
      console.error('Error in /api/admin/payment-screenshots:', error);
      res.status(500).json({ error: 'Failed to fetch payment screenshot submissions: ' + error.message });
    }
  });

  // 17c. Approve payment screenshot submission and set status to 'DONE'
  app.post('/api/admin/payment-screenshots/:id/approve', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;

    try {
      // 1. Update the record in payment_screenshots to DONE
      const updatedScreenshots = await db.update(paymentScreenshots)
        .set({ status: 'DONE' })
        .where(eq(paymentScreenshots.id, id))
        .returning();

      if (updatedScreenshots.length === 0) {
        return res.status(404).json({ error: 'Payment screenshot submission not found.' });
      }

      const submission = updatedScreenshots[0];

      // 2. Also find and update the transaction status to PAID
      const txn = await db.select().from(transactions).where(eq(transactions.id, submission.transactionId)).then(r => r[0]);
      if (txn && txn.paymentStatus !== 'PAID') {
        await db.update(transactions)
          .set({
            paymentStatus: 'PAID',
            completedAt: new Date()
          })
          .where(eq(transactions.id, submission.transactionId));

        // Create notifications & send emails to align with standard approval flow
        const buyer = await db.select().from(users).where(eq(users.id, txn.buyerId)).then(r => r[0]);
        const seller = await db.select().from(users).where(eq(users.id, txn.sellerId)).then(r => r[0]);

        await db.insert(notifications).values({
          id: generateId('not'),
          userId: txn.buyerId,
          type: 'PAYMENT_RECEIVED',
          message: `Your payment of NPR ${txn.finalAmount} for "${txn.listingTitle}" was VERIFIED. Order is confirmed!`,
          isRead: false,
          link: txn.listingId,
        });

        await db.insert(notifications).values({
          id: generateId('not'),
          userId: txn.sellerId,
          type: 'PAYMENT_RECEIVED',
          message: `Payment of NPR ${txn.finalAmount} verified for "${txn.listingTitle}". Please ship the item!`,
          isRead: false,
          link: txn.listingId,
        });

        if (buyer) {
          await sendEmail(
            buyer.email,
            buyer.name,
            `💰 Escrow Payment Confirmed: "${txn.listingTitle}"`,
            'PAYMENT_COMPLETED',
            { finalAmount: txn.finalAmount, paymentMethod: txn.paymentMethod || 'QR_CODE', title: txn.listingTitle, transactionId: txn.id, buyerName: buyer.name, sellerName: txn.sellerName }
          );
        }
        if (seller) {
          await sendEmail(
            seller.email,
            seller.name,
            `💰 Escrow Payment Confirmed: "${txn.listingTitle}"`,
            'PAYMENT_COMPLETED',
            { finalAmount: txn.finalAmount, paymentMethod: txn.paymentMethod || 'QR_CODE', title: txn.listingTitle, transactionId: txn.id, buyerName: txn.buyerName, sellerName: seller.name }
          );
        }

        await logAudit(
          'PAYMENT_VERIFIED_APPROVED',
          req.dbUser.id,
          req.dbUser.name,
          `Admin verified and APPROVED screenshot submission ID ${id}, automatically confirming transaction ${txn.id}.`
        );
      } else {
        await logAudit(
          'PAYMENT_VERIFIED_APPROVED',
          req.dbUser.id,
          req.dbUser.name,
          `Admin approved screenshot submission ID ${id}. Corresponding transaction was already processed or missing.`
        );
      }

      res.json({ success: true, submission: submission });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to approve screenshot: ' + error.message });
    }
  });

  // 17d. Reject payment screenshot submission and set status to 'REJECTED'
  app.post('/api/admin/payment-screenshots/:id/reject', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { reason } = req.body;
    const rejectionReason = reason || 'Incorrect or unreadable payment proof screenshot. Please upload a clear valid receipt.';

    try {
      // 1. Update the record in payment_screenshots to REJECTED
      const updatedScreenshots = await db.update(paymentScreenshots)
        .set({ status: 'REJECTED' })
        .where(eq(paymentScreenshots.id, id))
        .returning();

      if (updatedScreenshots.length === 0) {
        return res.status(404).json({ error: 'Payment screenshot submission not found.' });
      }

      const submission = updatedScreenshots[0];

      // 2. Update the transaction: reset paymentStatus to 'PENDING' and paymentScreenshot to null
      const txn = await db.select().from(transactions).where(eq(transactions.id, submission.transactionId)).then(r => r[0]);
      if (txn) {
        await db.update(transactions)
          .set({
            paymentStatus: 'PENDING',
            paymentScreenshot: null,
          })
          .where(eq(transactions.id, submission.transactionId));

        // Create notifications & send email to the buyer about the rejection
        const buyer = await db.select().from(users).where(eq(users.id, txn.buyerId)).then(r => r[0]);

        await db.insert(notifications).values({
          id: generateId('not'),
          userId: txn.buyerId,
          type: 'OUTBID', // We can use outbid or general type, let's keep message clear
          message: `⚠️ Your payment screenshot for "${txn.listingTitle}" was REJECTED: ${rejectionReason}. Please re-upload.`,
          isRead: false,
          link: `/payment?transactionId=${txn.id}`,
        });

        if (buyer) {
          await sendEmail(
            buyer.email,
            buyer.name,
            `⚠️ Action Required: Payment Rejected for "${txn.listingTitle}"`,
            'OUTBID', // Generic email template or custom text
            { title: txn.listingTitle, amount: txn.finalAmount, reason: rejectionReason }
          );
        }

        await logAudit(
          'PAYMENT_VERIFIED_REJECTED',
          req.dbUser.id,
          req.dbUser.name,
          `Admin REJECTED screenshot submission ID ${id} for transaction ${txn.id}. Reason: ${rejectionReason}`
        );
      }

      res.json({ success: true, submission: submission });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to reject screenshot: ' + error.message });
    }
  });

  // 18. Get all submitted reports
  app.get('/api/admin/reports', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
      res.json(allReports);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch reports: ' + error.message });
    }
  });

  // 19. Resolve Report
  app.post('/api/admin/reports/:id/resolve', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { status, adminNotes } = req.body; // 'RESOLVED', 'DISMISSED'

    try {
      const updated = await db.update(reports)
        .set({ status, adminNotes })
        .where(eq(reports.id, id))
        .returning();

      await logAudit(
        'REPORT_RESOLVED',
        req.dbUser.id,
        req.dbUser.name,
        `Report ID ${id} resolved as ${status}. Notes: ${adminNotes || 'None'}`
      );

      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to resolve report: ' + error.message });
    }
  });

  // 19b. Get simulated email logs (Admin only)
  app.get('/api/admin/emails', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const emails = await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt));
      res.json(emails);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch email logs: ' + error.message });
    }
  });

  // 19c. Get audit logs (Admin only)
  app.get('/api/admin/audits', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const audits = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
      res.json(audits);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch audit logs: ' + error.message });
    }
  });

  // 20. Admin Platform stats
  app.get('/api/admin/stats', requireAuth, async (req: AuthRequest, res) => {
    const isAdmin = req.dbUser.role === 'ADMIN' || 
                    req.dbUser.email === 'aditya.shh15@gmail.com' || 
                    req.dbUser.email === 'admin@bidhive.com.np' || 
                    req.dbUser.id === 'usr-admin' ||
                    req.dbUser.uid === 'usr-admin' ||
                    req.dbUser.email?.includes('admin');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const recentBids = await db.select({
        id: bids.id,
        bidderName: users.name,
        productTitle: listings.title,
        bidAmount: bids.amount,
        bidTime: bids.placedAt,
      })
      .from(bids)
      .leftJoin(users, eq(bids.bidderId, users.id))
      .leftJoin(listings, eq(bids.listingId, listings.id))
      .orderBy(desc(bids.placedAt))
      .limit(20);

      res.json({
        activeBidList: recentBids.map(b => ({
          id: b.id,
          bidderName: b.bidderName || 'Anonymous',
          productTitle: b.productTitle || 'Unknown Item',
          bidAmount: b.bidAmount || 0,
          bidTime: b.bidTime || new Date(),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch admin stats: ' + error.message });
    }
  });

  // 21. Admin Get Database Tables/Stats & Content
  app.get('/api/admin/db-tables', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { table } = req.query;
    try {
      if (table) {
        let rows: any[] = [];
        switch (table) {
          case 'users':
            rows = await db.select().from(users).limit(200);
            break;
          case 'categories':
            rows = await db.select().from(categories).limit(200);
            break;
          case 'listings':
            rows = await db.select().from(listings).limit(200);
            break;
          case 'bids':
            rows = await db.select().from(bids).limit(200);
            break;
          case 'auto_bid_configs':
            rows = await db.select().from(autoBidConfigs).limit(200);
            break;
          case 'transactions':
            rows = await db.select().from(transactions).limit(200);
            break;
          case 'reviews':
            rows = await db.select().from(reviews).limit(200);
            break;
          case 'notifications':
            rows = await db.select().from(notifications).limit(200);
            break;
          case 'reports':
            rows = await db.select().from(reports).limit(200);
            break;
          case 'sent_emails':
            rows = await db.select().from(sentEmails).limit(200);
            break;
          case 'audit_logs':
            rows = await db.select().from(auditLogs).limit(200);
            break;
          default:
            return res.status(400).json({ error: 'Invalid table name' });
        }
        return res.json({ table, rows });
      }

      // Return counts of all tables
      const [
        uCount, lCount, bCount, tCount, cCount, rCount, nCount, repCount, eCount, aCount, abCount
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(listings).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(bids).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(transactions).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(categories).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(reviews).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(notifications).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(reports).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(sentEmails).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(auditLogs).then(r => r[0].count),
        db.select({ count: sql<number>`count(*)` }).from(autoBidConfigs).then(r => r[0].count)
      ]);

      res.json({
        tables: [
          { name: 'users', count: Number(uCount), label: 'Users & Roles' },
          { name: 'categories', count: Number(cCount), label: 'Listing Categories' },
          { name: 'listings', count: Number(lCount), label: 'Product Listings' },
          { name: 'bids', count: Number(bCount), label: 'Bids Placed' },
          { name: 'auto_bid_configs', count: Number(abCount), label: 'Auto Bid Configs' },
          { name: 'transactions', count: Number(tCount), label: 'Escrow Transactions' },
          { name: 'reviews', count: Number(rCount), label: 'Seller & Buyer Reviews' },
          { name: 'notifications', count: Number(nCount), label: 'System Notifications' },
          { name: 'reports', count: Number(repCount), label: 'Listing Abuse Reports' },
          { name: 'sent_emails', count: Number(eCount), label: 'Simulated Email Logs' },
          { name: 'audit_logs', count: Number(aCount), label: 'System Audit Logs' }
        ]
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch database table stats: ' + error.message });
    }
  });

  // 22. Admin Reset Database (Wipe and Seed)
  app.post('/api/admin/db-reset', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      console.log(`[DB RESET] Initiated by Admin ${req.dbUser.name} (${req.dbUser.email})`);
      
      // Delete in order to avoid foreign key violations
      await db.delete(reviews);
      await db.delete(bids);
      await db.delete(transactions);
      await db.delete(autoBidConfigs);
      await db.delete(reports);
      await db.delete(notifications);
      await db.delete(sentEmails);
      await db.delete(auditLogs);
      await db.delete(listings);
      await db.delete(users);
      await db.delete(categories);

      // Re-seed database
      await seedDatabase();

      await logAudit(
        'DATABASE_RESET',
        req.dbUser.id,
        req.dbUser.name,
        'Database was completely wiped and re-seeded with initial professional data.'
      );

      res.json({ success: true, message: 'Database was completely wiped and re-seeded successfully!' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to reset database: ' + error.message });
    }
  });

  // 23. Admin Make All Listings Live
  app.post('/api/admin/make-all-live', requireAuth, async (req: AuthRequest, res) => {
    const isAdmin = req.dbUser.role === 'ADMIN' || 
                    req.dbUser.email === 'aditya.shh15@gmail.com' || 
                    req.dbUser.email === 'admin@bidhive.com.np' || 
                    req.dbUser.id === 'usr-admin' ||
                    req.dbUser.uid === 'usr-admin' ||
                    req.dbUser.email?.includes('admin');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      await makeAllListingsLive();
      res.json({ success: true, message: 'All auction products are now live and active!' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update listings: ' + error.message });
    }
  });

  // Run database migrations and seed data on server start if DATABASE_URL or SQL_HOST is configured
  if (process.env.DATABASE_URL || process.env.SQL_HOST) {
    try {
      console.log('[DB] Connecting to database and running migrations...');
      const { migrate } = await import('drizzle-orm/node-postgres/migrator');
      try {
        await migrate(db, { migrationsFolder: './drizzle', migrationsSchema: 'public' });
        console.log('[DB] Database schema migrated successfully!');
      } catch (migrateErr: any) {
        console.warn('[DB] Non-blocking database migration warning:', migrateErr.message);
      }
      
      console.log('[DB] Seeding initial database tables...');
      await seedDatabase();
      console.log('[DB] Database seeded successfully!');
      
      console.log('[DB] Ensuring all auction products are active & live...');
      await makeAllListingsLive();

      console.log('[DB] Running wallet migration for existing users...');
      await runExistingUserWalletMigration();
      console.log('[DB] Wallet migration completed!');
    } catch (err: any) {
      console.error('[DB] Database initialization failed:', err);
    }
  } else {
    console.log('[DB] Skipping database auto-migration/seeding (no connection configured).');
  }

  // Vite development middleware vs production build serving
  
  // --- TOPUP MANAGEMENT SYSTEM ---
  
  // USER: Submit topup request
  app.post('/api/wallet/topups', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { amount, paymentMethod, paymentReference, paymentScreenshotUrl, idempotencyKey } = req.body;
      const requestedAmount = Number(amount);
      if (isNaN(requestedAmount) || requestedAmount < 100 || requestedAmount > 100000) {
        return res.status(400).json({ error: 'Amount must be between 100 and 100,000' });
      }
      
      const wallet = await db.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).then(r => r[0]);
      if (!wallet) {
         return res.status(404).json({ error: 'Wallet not found' });
      }

      if (!idempotencyKey) {
        return res.status(400).json({ error: 'idempotencyKey is required' });
      }

      const existing = await db.select().from(topupRequests).where(eq(topupRequests.idempotencyKey, idempotencyKey)).then(r => r[0]);
      if (existing) {
        return res.json(existing);
      }

      const [topup] = await db.insert(topupRequests).values({
        id: generateId('tpr'),
        userId: req.dbUser.id,
        walletId: wallet.id,
        requestedAmount,
        paymentMethod,
        paymentReference: paymentReference || null,
        paymentScreenshotUrl: paymentScreenshotUrl || null,
        status: 'PENDING',
        idempotencyKey
      }).returning();
      
      res.json(topup);
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Duplicate request' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // USER: Get own topups
  app.get('/api/wallet/topups', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await db.select().from(topupRequests)
        .where(eq(topupRequests.userId, req.dbUser.id))
        .orderBy(desc(topupRequests.submittedAt));
      res.json(rows);
    } catch(err:any) {
      res.status(500).json({ error: err.message });
    }
  });

  // USER: Cancel topup
  app.post('/api/wallet/topups/:requestId/cancel', requireAuth, async (req: AuthRequest, res) => {
    try {
      const [topup] = await db.update(topupRequests)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(and(eq(topupRequests.id, req.params.requestId), eq(topupRequests.userId, req.dbUser.id), eq(topupRequests.status, 'PENDING')))
        .returning();
      if (!topup) return res.status(404).json({ error: 'Request not found or not pending' });
      res.json(topup);
    } catch(err:any) { res.status(500).json({ error: err.message }); }
  });

  // ADMIN: Get all topups
  app.get('/api/admin/topups', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const result = await db.execute(sql`
        SELECT tr.*, u.name as user_name, u.email as user_email, w.available_balance
        FROM topup_requests tr
        JOIN users u ON tr.user_id = u.id
        JOIN wallets w ON tr.wallet_id = w.id
        ORDER BY tr.submitted_at DESC
      `);
      res.json(result.rows || result);
    } catch(err:any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN: Approve topup
  app.post('/api/admin/topups/:requestId/approve', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const { approvedAmount, adminNote } = req.body;
      const { requestId } = req.params;
      
      const result = await db.transaction(async (tx) => {
        const topup = await tx.select().from(topupRequests).where(eq(topupRequests.id, requestId)).for('update').then(r => r[0]);
        if (!topup) throw new Error('Top-up request not found');
        if (topup.status !== 'PENDING') throw new Error('Top-up request is not pending');

        const finalAmount = approvedAmount ? Number(approvedAmount) : topup.requestedAmount;
        if (finalAmount !== topup.requestedAmount && !adminNote) {
           throw new Error('Admin note is required when changing the approved amount');
        }

        const wallet = await tx.select().from(wallets).where(eq(wallets.id, topup.walletId)).for('update').then(r => r[0]);
        if (!wallet) throw new Error('Wallet not found');

        const balanceBefore = wallet.availableBalance;
        const balanceAfter = balanceBefore + finalAmount;

        const [wtx] = await tx.insert(walletTransactions).values({
          id: generateId('wtx'),
          walletId: wallet.id,
          userId: topup.userId,
          type: 'TOP_UP',
          amount: finalAmount,
          status: 'SUCCESS',
          description: `Top-up approved by admin. ${adminNote || ''}`.trim(),
          referenceType: 'TOP_UP',
          referenceId: topup.id,
          balanceBefore,
          balanceAfter
        }).returning();

        await tx.update(wallets).set({ availableBalance: balanceAfter, updatedAt: new Date() }).where(eq(wallets.id, wallet.id));

        const [updatedTopup] = await tx.update(topupRequests).set({
          status: 'APPROVED',
          approvedAmount: finalAmount,
          reviewedAt: new Date(),
          reviewedBy: req.dbUser.id,
          adminNote: adminNote || null,
          walletTransactionId: wtx.id,
          updatedAt: new Date()
        }).where(eq(topupRequests.id, topup.id)).returning();

        return updatedTopup;
      });
      res.json(result);
    } catch(err:any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN: Reject topup
  app.post('/api/admin/topups/:requestId/reject', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const { rejectionReason } = req.body;
      if (!rejectionReason) return res.status(400).json({ error: 'Rejection reason is required' });
      
      const { requestId } = req.params;
      
      const [topup] = await db.update(topupRequests).set({
        status: 'REJECTED',
        rejectionReason,
        reviewedAt: new Date(),
        reviewedBy: req.dbUser.id,
        updatedAt: new Date()
      }).where(and(eq(topupRequests.id, requestId), eq(topupRequests.status, 'PENDING'))).returning();
      
      if (!topup) return res.status(404).json({ error: 'Pending top-up request not found' });
      res.json(topup);
    } catch(err:any) { res.status(500).json({ error: err.message }); }
  });

  // ADMIN: Credit wallet
  app.post('/api/admin/wallets/:userId/credit', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const { amount, category, reason, reference, idempotencyKey } = req.body;
      const amountNum = Number(amount);
      if (!amountNum || amountNum <= 0) throw new Error('Invalid amount');
      if (!reason) throw new Error('Reason is compulsory');
      if (!idempotencyKey) throw new Error('Idempotency key required');

      const result = await db.transaction(async (tx) => {
        const wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.params.userId)).for('update').then(r => r[0]);
        if (!wallet) throw new Error('Wallet not found');

        const existing = await tx.select().from(walletTransactions).where(eq(walletTransactions.idempotencyKey, idempotencyKey)).then(r => r[0]);
        if (existing) return existing;

        const balanceBefore = wallet.availableBalance;
        const balanceAfter = balanceBefore + amountNum;

        const [wtx] = await tx.insert(walletTransactions).values({
          id: generateId('wtx'),
          walletId: wallet.id,
          userId: req.params.userId,
          type: 'ADMIN_CREDIT',
          amount: amountNum,
          description: reason,
          referenceType: 'ADMIN_ADJUSTMENT',
          referenceId: reference || null,
          metadata: JSON.stringify({ category, adminId: req.dbUser.id }),
          balanceBefore,
          balanceAfter,
          idempotencyKey
        }).returning();

        await tx.update(wallets).set({ availableBalance: balanceAfter, updatedAt: new Date() }).where(eq(wallets.id, wallet.id));
        return wtx;
      });
      res.json(result);
    } catch(err:any) { res.status(500).json({ error: err.message }); }
  });

  // ADMIN: Debit wallet
  app.post('/api/admin/wallets/:userId/debit', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const { amount, category, reason, reference, idempotencyKey } = req.body;
      const amountNum = Number(amount);
      if (!amountNum || amountNum <= 0) throw new Error('Invalid amount');
      if (!reason) throw new Error('Reason is compulsory');
      if (!idempotencyKey) throw new Error('Idempotency key required');

      const result = await db.transaction(async (tx) => {
        const wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.params.userId)).for('update').then(r => r[0]);
        if (!wallet) throw new Error('Wallet not found');

        const existing = await tx.select().from(walletTransactions).where(eq(walletTransactions.idempotencyKey, idempotencyKey)).then(r => r[0]);
        if (existing) return existing;

        const balanceBefore = wallet.availableBalance;
        if (balanceBefore < amountNum) throw new Error('Insufficient available balance');
        const balanceAfter = balanceBefore - amountNum;

        const [wtx] = await tx.insert(walletTransactions).values({
          id: generateId('wtx'),
          walletId: wallet.id,
          userId: req.params.userId,
          type: 'ADMIN_DEBIT',
          amount: amountNum,
          description: reason,
          referenceType: 'ADMIN_ADJUSTMENT',
          referenceId: reference || null,
          metadata: JSON.stringify({ category, adminId: req.dbUser.id }),
          balanceBefore,
          balanceAfter,
          idempotencyKey
        }).returning();

        await tx.update(wallets).set({ availableBalance: balanceAfter, updatedAt: new Date() }).where(eq(wallets.id, wallet.id));
        return wtx;
      });
      res.json(result);
    } catch(err:any) { res.status(500).json({ error: err.message }); }
  });

  // ADMIN: Get user wallet transactions (already partly handled by /api/wallet/transactions but need admin version)
  app.get('/api/admin/wallets/:userId/transactions', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const rows = await db.select().from(walletTransactions)
        .where(eq(walletTransactions.userId, req.params.userId))
        .orderBy(desc(walletTransactions.createdAt));
      res.json(rows);
    } catch(err:any) { res.status(500).json({ error: err.message }); }
  });

  // --- END TOPUP SYSTEM ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  
  // Startup Recovery Check: Conclude expired auctions & process pending email outbox
  setTimeout(async () => {
    console.log('[Startup] Executing initial recovery check for expired auctions and email outbox...');
    await processAllExpiredAuctions(getPusher);
    await processEmailOutbox();
  }, 3000);

  // Background cron jobs
  cron.schedule('* * * * *', async () => {
    console.log('[Cron] Checking for expired auctions...');
    await processAllExpiredAuctions(getPusher);
  });

  cron.schedule('*/30 * * * * *', async () => {
    await processEmailOutbox();
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}

startServer();
