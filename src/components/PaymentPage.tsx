import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { api } from '../lib/api';
import { 
  QrCode, 
  UploadCloud, 
  CheckCircle2, 
  ArrowLeft, 
  AlertTriangle, 
  Info, 
  CreditCard, 
  Smartphone,
  RefreshCw,
  FileImage,
  X
} from 'lucide-react';

interface PaymentPageProps {
  transactionId: string | null;
  onBack: () => void;
}

export default function PaymentPage({ transactionId, onBack }: PaymentPageProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Screenshot Upload State
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ESEWA' | 'KHALTI' | 'QR_CODE'>('QR_CODE');
  const [uploadDragActive, setUploadDragActive] = useState(false);

  // Fetch transaction on load
  const loadTransaction = async () => {
    if (!transactionId) {
      setFetching(false);
      return;
    }
    setFetching(true);
    setError(null);
    try {
      const txns = await api.getTransactions();
      const found = txns.find((t: any) => t.id === transactionId);
      if (found) {
        setTransaction(found);
        if (found.paymentScreenshot) {
          setPaymentScreenshot(found.paymentScreenshot);
        }
        if (found.paymentMethod) {
          setPaymentMethod(found.paymentMethod);
        }
      } else {
        setError('Requested settlement transaction could not be located in your profile ledger.');
      }
    } catch (err: any) {
      setError('Failed to fetch transaction details: ' + err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  // Handle Drag & Drop Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setUploadDragActive(true);
    } else if (e.type === "dragleave") {
      setUploadDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file format. Please upload a payment screenshot image (PNG, JPG, JPEG).');
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setPaymentScreenshot(reader.result as string);
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmitProof = async () => {
    if (!transaction || !paymentScreenshot) return;
    setLoading(true);
    setError(null);
    try {
      await api.uploadPaymentScreenshot(transaction.id, paymentScreenshot, paymentMethod);
      setSuccess(true);
      // Re-fetch to get updated state
      await loadTransaction();
    } catch (err: any) {
      setError(err.message || 'Failed to transmit transaction screenshot.');
    } finally {
      setLoading(false);
    }
  };

  // Format NPR helper
  const formatNPR = (amount: number) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount).replace('NPR', 'Rs.');
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-extrabold tracking-wider uppercase">Loading Secured Payment Gateway...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200/80 shadow-lg p-8 space-y-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Secure Payment Session Failed</h2>
        <p className="text-sm text-slate-500 leading-relaxed font-semibold">
          {error || 'No transaction was found associated with your credentials. Please browse active listings and win or purchase an item first.'}
        </p>
        <button
          onClick={onBack}
          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Marketplace
        </button>
      </div>
    );
  }

  const isVerifying = transaction.paymentStatus === 'VERIFYING';
  const isPaid = transaction.paymentStatus === 'PAID';

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900 cursor-pointer transition-colors uppercase tracking-wider bg-white px-4 py-2 rounded-xl border border-slate-200/60 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="text-right">
          <span className="text-[10px] bg-red-100 text-red-800 px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-red-200 shadow-xs">
            🛡️ BidHive Secured Vault Gateway
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: QR Code & Payment instructions */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Transaction Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Purchase Details</h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                <span className="text-slate-400 font-bold block">ITEM / PRODUCT</span>
                <span className="text-slate-800 font-extrabold truncate block">{transaction.listingTitle}</span>
              </div>
              <div className="space-y-1 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                <span className="text-slate-400 font-bold block">AUCTION ID</span>
                <span className="text-slate-500 font-mono font-bold block">{transaction.listingId}</span>
              </div>
              <div className="space-y-1 bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
                <span className="text-slate-400 font-bold block">SELLER ACCOUNT</span>
                <span className="text-slate-800 font-extrabold block">{transaction.sellerName}</span>
              </div>
              <div className="space-y-1 bg-red-50/50 border border-red-100 p-3 rounded-xl">
                <span className="text-red-500/80 font-black block uppercase tracking-wide">Settlement Amount</span>
                <span className="text-red-600 font-black text-base block">{formatNPR(transaction.finalAmount)}</span>
              </div>
            </div>

            <div className="flex gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 font-medium">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <p>Your payment is held securely in BidHive Secure Vault. Funds are only disbursed to the seller after you receive and confirm the item's condition.</p>
            </div>
          </div>

          {/* QR Code Scan and Pay Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <QrCode className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Scan & Pay (eSewa / Khalti)</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
              
              {/* Dummy QR Code Visual Layout */}
              <div className="p-4 bg-slate-900 border-2 border-slate-950 rounded-2xl flex flex-col items-center justify-center space-y-2 shrink-0 shadow-lg">
                <div className="bg-white p-3 rounded-xl border-4 border-slate-950">
                  <div className="relative h-32 w-32 bg-slate-100 flex items-center justify-center">
                    {/* Visual simulated QR code patterns using custom CSS elements */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-4 border-slate-900 bg-white" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-4 border-slate-900 bg-white" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-4 border-slate-900 bg-white" />
                    <div className="grid grid-cols-5 gap-1.5 p-1">
                      <div className="w-3 h-3 bg-slate-950 rounded" />
                      <div className="w-3 h-3 bg-slate-300 rounded" />
                      <div className="w-3 h-3 bg-slate-950 rounded" />
                      <div className="w-3 h-3 bg-slate-950 rounded" />
                      <div className="w-3 h-3 bg-slate-300 rounded" />
                      <div className="w-3 h-3 bg-slate-300 rounded" />
                      <div className="w-3 h-3 bg-slate-950 rounded" />
                      <div className="w-3 h-3 bg-slate-300 rounded" />
                      <div className="w-3 h-3 bg-slate-950 rounded" />
                      <div className="w-3 h-3 bg-slate-950 rounded" />
                    </div>
                    {/* Scan Badge in Center */}
                    <div className="absolute h-10 w-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-black text-[9px] uppercase tracking-tighter">
                      Scan
                    </div>
                  </div>
                </div>
                <span className="text-[9px] text-slate-300 font-extrabold uppercase tracking-widest block text-center">BidHive Merchant Account</span>
                <span className="text-[8px] text-slate-500 font-bold block text-center">SCAN TO DIRECT ROUTE SECURE PAYMENT</span>
              </div>

              {/* Instructions */}
              <div className="space-y-3.5 text-xs">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">HOW TO SETTLE SECURE PAYMENT:</span>
                <ol className="list-decimal list-inside space-y-2.5 text-slate-600 font-bold">
                  <li>Open <strong className="text-green-600 font-black">eSewa</strong> or <strong className="text-purple-600 font-black">Khalti</strong> app on your device.</li>
                  <li>Tap the <strong className="text-slate-900 font-black">Scan & Pay</strong> camera button in your app.</li>
                  <li>Aim your camera at the BidHive QR code to load the secure payment details.</li>
                  <li>Verify the total amount is exactly <strong className="text-red-600 font-black">{formatNPR(transaction.finalAmount)}</strong>.</li>
                  <li>Settle the payment, take a clear screenshot of the successful receipt screen, and upload it on this page.</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-950 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p><strong>Note:</strong> Verification takes up to 2 hours. If you need any assistance, contact our official payment support channel at <span className="font-extrabold text-red-600 underline">aditya.shh15@gmail.com</span>.</p>
            </div>
          </div>

        </div>

        {/* Right Column: Upload Proof Box */}
        <div className="md:col-span-5 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <UploadCloud className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Upload Settlement Receipt</h3>
            </div>

            {/* Select Payment Method Option */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Select Settle Method Used</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isVerifying || isPaid}
                  onClick={() => setPaymentMethod('QR_CODE')}
                  className={`py-2 text-xs font-black rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'QR_CODE'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  QR Code
                </button>
                <button
                  type="button"
                  disabled={isVerifying || isPaid}
                  onClick={() => setPaymentMethod('ESEWA')}
                  className={`py-2 text-xs font-black rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'ESEWA'
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  eSewa
                </button>
                <button
                  type="button"
                  disabled={isVerifying || isPaid}
                  onClick={() => setPaymentMethod('KHALTI')}
                  className={`py-2 text-xs font-black rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'KHALTI'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  Khalti
                </button>
              </div>
            </div>

            {/* Verification State Banner */}
            {isPaid && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <span className="font-extrabold text-emerald-900 text-sm block">Payment Verified & Confirmed</span>
                <p className="text-xs text-slate-500 leading-normal font-semibold">
                  Excellent! Our administrative team has approved your payment screenshot. The settlement amount is locked, and the seller has been authorized to dispatch your item!
                </p>
              </div>
            )}

            {isVerifying && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-center space-y-2">
                <RefreshCw className="w-10 h-10 text-yellow-600 animate-spin mx-auto" />
                <span className="font-extrabold text-yellow-900 text-sm block">Manual Review Pending</span>
                <p className="text-xs text-slate-500 leading-normal font-semibold">
                  Your settlement screenshot has been securely uploaded and is placed in our manual validation queue.
                </p>
                <p className="text-[10px] text-slate-400 font-bold bg-white/60 p-2 rounded-lg">
                  ⏰ Expected Verification Window: &lt; 2 Hours
                </p>
              </div>
            )}

            {/* File Drag Area (Active only when pending upload) */}
            {!isVerifying && !isPaid && (
              <div className="space-y-4">
                
                {paymentScreenshot ? (
                  <div className="space-y-3">
                    <div className="relative border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-slate-50">
                      <img 
                        src={paymentScreenshot} 
                        alt="Settle Receipt Screenshot Preview" 
                        className="max-h-64 mx-auto object-contain w-full"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setPaymentScreenshot(null)}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl text-[10px] text-slate-600 font-extrabold uppercase tracking-wide justify-center">
                      <FileImage className="w-4 h-4 text-slate-500" />
                      <span>Screenshot Loaded ({paymentScreenshot.length > 100000 ? Math.round(paymentScreenshot.length / 1024) + ' KB' : 'Active base64 buffer'})</span>
                    </div>
                  </div>
                ) : (
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${
                      uploadDragActive 
                        ? 'border-red-500 bg-red-50/50' 
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/50'
                    }`}
                  >
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 opacity-0 w-full cursor-pointer"
                    />
                    
                    <div className="space-y-3 pointer-events-none">
                      <UploadCloud className="w-10 h-10 text-slate-400 mx-auto" />
                      <div>
                        <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Drag receipt screenshot here</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">or click here to search local directory files</p>
                      </div>
                      <span className="inline-block px-3 py-1 bg-slate-100 text-[9px] font-extrabold text-slate-500 rounded-full">
                        PNG, JPG, JPEG Accepted
                      </span>
                    </div>
                  </div>
                )}

                {paymentScreenshot && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSubmitProof}
                    className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit Proof for Verification</span>
                      </>
                    )}
                  </button>
                )}

              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 text-center font-bold">
                ✓ Receipt successfully transmitted. Manual review timeline registered!
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
