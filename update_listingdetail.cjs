const fs = require('fs');
let code = fs.readFileSync('src/components/ListingDetail.tsx', 'utf8');

if (!code.includes('walletInfo?: any;')) {
  // Add prop
  code = code.replace(
    '  currentUser: User | null;',
    '  currentUser: User | null;\n  walletInfo?: any;'
  );
  
  code = code.replace(
    '  currentUser,\n  category,',
    '  currentUser,\n  walletInfo,\n  category,'
  );
  
  // Find where handleManualBidSubmit renders the form
  const oldForm = `{/* Manual Bid Form */}
                    {!isAutoBidActive ? (
                      <form onSubmit={handleManualBidSubmit} className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <label className="text-slate-300 block">Enter Manual Bid Amount (NPR)</label>
                          <span className="text-red-400 block font-bold">Min Bid: {formatNPR(minRequiredBid)}</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-400">Rs.</span>
                            <input
                              type="number"
                              placeholder={\`\${minRequiredBid}\`}
                              value={customBid}
                              onChange={(e) => setCustomBid(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                          <button
                            id="btn-place-manual-bid"
                            type="submit"
                            className="bg-red-600 hover:bg-red-700 text-white px-5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Hammer className="w-4 h-4" />
                            Place Bid
                          </button>
                        </div>
                      </form>`;

  const newForm = `{/* Manual Bid Form */}
                    {!isAutoBidActive ? (() => {
                      const bidVal = parseFloat(customBid) || 0;
                      // Calculate required additional hold if user is already highest bidder
                      let requiredHold = bidVal;
                      const userIsHighestBidder = highestBid?.bidderId === currentUser?.id;
                      if (userIsHighestBidder) {
                        requiredHold = Math.max(0, bidVal - highestBid.amount);
                      }
                      
                      const hasSufficientBalance = walletInfo && walletInfo.availableBalance >= requiredHold;
                      const remainingBalance = walletInfo ? walletInfo.availableBalance - requiredHold : 0;
                      const canBid = customBid !== '' && bidVal >= minRequiredBid && hasSufficientBalance;
                      
                      return (
                      <form onSubmit={handleManualBidSubmit} className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <label className="text-slate-300 block">Enter Manual Bid Amount (NPR)</label>
                          <span className="text-red-400 block font-bold">Min Bid: {formatNPR(minRequiredBid)}</span>
                        </div>
                        
                        {walletInfo && (
                          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 mb-3">
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-slate-400">Current Available Balance:</span>
                              <span className="text-emerald-400 font-bold">{formatNPR(walletInfo.availableBalance)}</span>
                            </div>
                            
                            {userIsHighestBidder && bidVal > 0 && (
                              <div className="flex justify-between items-center text-xs mb-1">
                                <span className="text-slate-400">Already Held (Previous Bid):</span>
                                <span className="text-orange-400 font-bold">{formatNPR(highestBid.amount)}</span>
                              </div>
                            )}

                            {bidVal > 0 && (
                              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-700/50 mt-1">
                                <span className="text-slate-300">Remaining After Bid:</span>
                                <span className={\`font-bold \${remainingBalance < 0 ? 'text-red-400' : 'text-slate-200'}\`}>
                                  {formatNPR(remainingBalance)}
                                </span>
                              </div>
                            )}
                            
                            {!hasSufficientBalance && bidVal > 0 && (
                              <div className="mt-2 text-red-400 text-xs font-bold bg-red-950/30 p-2 rounded flex items-center justify-between">
                                <span>Insufficient wallet balance.</span>
                                <a href="#" onClick={(e) => { e.preventDefault(); if(onAuthRequired) { /* Need a way to navigate to wallet, maybe alert for now or link */ alert('Go to wallet to top up'); } }} className="underline hover:text-red-300">Top Up</a>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-400">Rs.</span>
                            <input
                              type="number"
                              placeholder={\`\${minRequiredBid}\`}
                              value={customBid}
                              onChange={(e) => setCustomBid(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                          <button
                            id="btn-place-manual-bid"
                            type="submit"
                            disabled={!canBid}
                            className={\`px-5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer \${
                               canBid ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-70'
                            }\`}
                          >
                            <Hammer className="w-4 h-4" />
                            Place Bid
                          </button>
                        </div>
                      </form>
                    ); })() : (`;
  
  code = code.replace(oldForm, newForm);
  fs.writeFileSync('src/components/ListingDetail.tsx', code);
}
