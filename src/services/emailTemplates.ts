export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface WinnerEmailParams {
  winnerName: string;
  productTitle: string;
  finalAmount: number;
  endTime: string;
  listingId: string;
  appUrl: string;
}

export function generateWinnerEmail(params: WinnerEmailParams) {
  const name = escapeHtml(params.winnerName || 'Valued User');
  const title = escapeHtml(params.productTitle);
  const amount = Number(params.finalAmount).toLocaleString();
  const listingUrl = `${params.appUrl.replace(/\/$/, '')}/#listing-${encodeURIComponent(params.listingId)}`;

  const subject = `You won an auction on BidHive! - ${params.productTitle}`;

  const textContent = `Hello ${params.winnerName},

Congratulations! You won the auction.

Product: ${params.productTitle}
Winning amount: Rs. ${amount}
Auction ended: ${new Date(params.endTime).toLocaleString()}

Open BidHive to view the auction and complete the next step:
${listingUrl}

Thank you,
BidHive Team`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; tracking-tight: -0.025em; }
    .content { padding: 32px 24px; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
    .amount-box { background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #e2e8f0; }
    .amount-label { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .amount-value { font-size: 32px; color: #0f172a; font-weight: 900; margin-top: 4px; }
    .button { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; padding: 14px 28px; border-radius: 12px; font-size: 15px; margin-top: 16px; text-align: center; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BidHive Nepal</h1>
    </div>
    <div class="content">
      <span class="badge">Auction Winner</span>
      <h2 style="margin-top:0; color:#0f172a;">Congratulations, ${name}!</h2>
      <p style="font-size:15px; color:#334155; line-height:1.6;">You placed the highest bid and won the auction for <strong>${title}</strong>.</p>
      
      <div class="amount-box">
        <div class="amount-label">Winning Bid Amount</div>
        <div class="amount-value">Rs. ${amount}</div>
      </div>

      <p style="font-size:14px; color:#475569; line-height:1.5;">Your held wallet balance has been processed. Please view your item details and coordinate with the seller to finalize fulfillment.</p>

      <div style="text-align: center; margin-top: 28px;">
        <a href="${listingUrl}" class="button">View Winning Listing</a>
      </div>
    </div>
    <div class="footer">
      <p>BidHive - Nepal's Premier Auction Marketplace</p>
      <p>If you have questions, please reach out to support@bidhive.np</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, textContent, htmlContent };
}

export interface SellerEmailParams {
  sellerName: string;
  productTitle: string;
  finalAmount: number;
  winnerName: string;
  listingId: string;
  appUrl: string;
}

export function generateSellerEmail(params: SellerEmailParams) {
  const name = escapeHtml(params.sellerName || 'Valued Seller');
  const title = escapeHtml(params.productTitle);
  const winner = escapeHtml(params.winnerName);
  const amount = Number(params.finalAmount).toLocaleString();
  const listingUrl = `${params.appUrl.replace(/\/$/, '')}/#listing-${encodeURIComponent(params.listingId)}`;

  const subject = `Your listing "${params.productTitle}" has been won!`;

  const textContent = `Hello ${params.sellerName},

Great news! Your auction for "${params.productTitle}" has ended successfully.

Winner: ${params.winnerName}
Final Amount: Rs. ${amount}

View your transaction details on BidHive:
${listingUrl}

Thank you,
BidHive Team`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #0f172a; padding: 28px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 24px; }
    .button { display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">BidHive Seller Update</h2>
    </div>
    <div class="content">
      <h3 style="margin-top:0;">Hello ${name},</h3>
      <p>Your listing <strong>${title}</strong> has officially ended with a winning bidder!</p>
      <ul>
        <li><strong>Winner:</strong> ${winner}</li>
        <li><strong>Final Sale Price:</strong> Rs. ${amount}</li>
      </ul>
      <p><a href="${listingUrl}" class="button">Manage Sale</a></p>
    </div>
  </div>
</body>
</html>`;

  return { subject, textContent, htmlContent };
}

export interface LosingBidderEmailParams {
  bidderName: string;
  productTitle: string;
  finalAmount: number;
  listingId: string;
  appUrl: string;
}

export function generateLosingBidderEmail(params: LosingBidderEmailParams) {
  const name = escapeHtml(params.bidderName || 'Bidder');
  const title = escapeHtml(params.productTitle);
  const amount = Number(params.finalAmount).toLocaleString();
  const listingUrl = `${params.appUrl.replace(/\/$/, '')}/#listing-${encodeURIComponent(params.listingId)}`;

  const subject = `The auction for "${params.productTitle}" has ended`;

  const textContent = `Hello ${params.bidderName},

The auction for "${params.productTitle}" has concluded with a winning bid of Rs. ${amount}.

Your held balance for this listing has been fully released back to your available wallet.

Explore more live auctions on BidHive:
${params.appUrl}

Thank you,
BidHive Team`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #334155; padding: 24px; text-align: center; color: #ffffff; }
    .content { padding: 28px 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h3 style="margin:0;">BidHive Auction Update</h3>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>The auction for <strong>${title}</strong> has ended at Rs. ${amount}.</p>
      <p>Your wallet hold for this item has been <strong>released</strong> back to your available balance.</p>
      <p><a href="${listingUrl}">View Auction Details</a></p>
    </div>
  </div>
</body>
</html>`;

  return { subject, textContent, htmlContent };
}

export interface ReserveNotMetEmailParams {
  sellerName: string;
  productTitle: string;
  highestBidAmount?: number;
  reservePrice?: number;
  listingId: string;
  appUrl: string;
}

export function generateReserveNotMetEmail(params: ReserveNotMetEmailParams) {
  const name = escapeHtml(params.sellerName || 'Seller');
  const title = escapeHtml(params.productTitle);
  const listingUrl = `${params.appUrl.replace(/\/$/, '')}/#listing-${encodeURIComponent(params.listingId)}`;

  const subject = `Your auction "${params.productTitle}" ended without a winner`;

  const textContent = `Hello ${params.sellerName},

Your auction for "${params.productTitle}" has ended without achieving the reserve price.

No winner was selected. You can relist your item or adjust the reserve price on BidHive.

${listingUrl}

Thank you,
BidHive Team`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #475569; padding: 24px; text-align: center; color: #ffffff; }
    .content { padding: 28px 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h3 style="margin:0;">BidHive Reserve Price Not Met</h3>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Your auction for <strong>${title}</strong> has ended without reaching your reserve price.</p>
      <p>No sale transaction was created and bidder holds have been released.</p>
      <p><a href="${listingUrl}">Relist or View Item</a></p>
    </div>
  </div>
</body>
</html>`;

  return { subject, textContent, htmlContent };
}
