import React, { useState } from 'react';
import { Transaction, PaymentMethod } from '../types';
import { CreditCard, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';

interface PaymentModalProps {
  transaction: Transaction;
  onPaymentSuccess: (transactionId: string, method: PaymentMethod) => void;
  onClose: () => void;
  defaultMethod?: PaymentMethod;
}

export default function PaymentModal({ transaction, onPaymentSuccess, onClose, defaultMethod = 'ESEWA' }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(defaultMethod);
  const [step, setStep] = useState<'SELECT' | 'GATEWAY' | 'PROCESSING' | 'SUCCESS'>(defaultMethod ? 'GATEWAY' : 'SELECT');
  const [gatewayMode, setGatewayMode] = useState<'QR' | 'CREDENTIALS'>('QR');
  const [credentials, setCredentials] = useState({
    mobileNumber: '',
    password: '',
    otp: ''
  });
  const [error, setError] = useState('');

  // Format NPR helper
  const formatNPR = (amount: number) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount).replace('NPR', 'Rs.');
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep('GATEWAY');
    setError('');
  };

  const handleGatewaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.mobileNumber || !credentials.password) {
      setError('Please fill in your login credentials');
      return;
    }
    if (credentials.mobileNumber.length !== 10 || !credentials.mobileNumber.startsWith('9')) {
      setError('Please enter a valid 10-digit Nepali mobile number (starting with 9)');
      return;
    }

    setError('');
    setStep('PROCESSING');

    // Simulate OTP step after 2s
    setTimeout(() => {
      setStep('SUCCESS');
    }, 2000);
  };

  return (
    <div id="payment-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div id="payment-modal" className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-600" />
            <h3 className="font-extrabold text-slate-950 text-base">Settle Payment (NPR Gateway)</h3>
          </div>
          <button id="btn-close-payment-modal" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          
          {/* Summary Box */}
          {step !== 'SUCCESS' && (
            <div className="mb-6 p-4 rounded-xl bg-red-50/50 border border-red-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Item</span>
                <span className="text-sm font-bold text-slate-900 line-clamp-1">{transaction.listingTitle}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Amount</span>
                <span className="text-base font-extrabold text-red-600">{formatNPR(transaction.finalAmount)}</span>
              </div>
            </div>
          )}

          {/* Step 1: Select Payment Method */}
          {step === 'SELECT' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 text-center mb-2">
                Choose a Nepali payment gateway to settle your transaction. You must pay within 30 minutes to preserve your reliability rating.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* eSewa Option */}
                <button
                  id="btn-select-esewa"
                  onClick={() => handleMethodSelect('ESEWA')}
                  className="p-5 rounded-xl border-2 border-slate-100 hover:border-[#60bb46] hover:bg-emerald-50/20 transition-all text-center flex flex-col items-center gap-3 cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-full bg-[#60bb46]/10 flex items-center justify-center text-[#60bb46] font-extrabold text-xl group-hover:scale-105 transition-transform">
                    eS
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900 group-hover:text-[#60bb46] transition-colors">eSewa Wallet</span>
                    <span className="text-[10px] text-slate-400">Direct instant transfer</span>
                  </div>
                </button>

                {/* Khalti Option */}
                <button
                  id="btn-select-khalti"
                  onClick={() => handleMethodSelect('KHALTI')}
                  className="p-5 rounded-xl border-2 border-slate-100 hover:border-[#5c2d91] hover:bg-purple-50/20 transition-all text-center flex flex-col items-center gap-3 cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-full bg-[#5c2d91]/10 flex items-center justify-center text-[#5c2d91] font-extrabold text-xl group-hover:scale-105 transition-transform">
                    Kh
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900 group-hover:text-[#5c2d91] transition-colors">Khalti Wallet</span>
                    <span className="text-[10px] text-slate-400">Fast digital checkout</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Gateway Simulation Form */}
          {step === 'GATEWAY' && selectedMethod && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${selectedMethod === 'ESEWA' ? 'bg-[#60bb46]' : 'bg-[#5c2d91]'}`} />
                  <span className="font-extrabold text-sm uppercase tracking-wide text-slate-700">
                    {selectedMethod === 'ESEWA' ? 'eSewa Merchant Checkout' : 'Khalti Payment Gateway'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('SELECT')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Change Method
                </button>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex border border-slate-200 rounded-xl overflow-hidden p-1 bg-slate-50">
                <button
                  type="button"
                  id="tab-pay-qr"
                  onClick={() => setGatewayMode('QR')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    gatewayMode === 'QR'
                      ? 'bg-white shadow-xs text-slate-950 border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Scan QR Code
                </button>
                <button
                  type="button"
                  id="tab-pay-credentials"
                  onClick={() => setGatewayMode('CREDENTIALS')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    gatewayMode === 'CREDENTIALS'
                      ? 'bg-white shadow-xs text-slate-950 border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Wallet Login
                </button>
              </div>

              {gatewayMode === 'QR' ? (
                <div className="space-y-4 text-center py-2">
                  <div className="relative inline-block">
                    {/* Dummy QR Code */}
                    <svg width="180" height="180" viewBox="0 0 29 29" className="mx-auto border border-slate-200 p-2.5 bg-white rounded-xl shadow-xs">
                      <rect width="29" height="29" fill="white" />
                      <path d="M0,0 h7 v7 h-7 z M1,1 h5 v5 h-5 z M2,2 h3 v3 h-3 z" fill={selectedMethod === 'ESEWA' ? '#60bb46' : '#5c2d91'} />
                      <path d="M22,0 h7 v7 h-7 z M23,1 h5 v5 h-5 z M24,2 h3 v3 h-3 z" fill={selectedMethod === 'ESEWA' ? '#60bb46' : '#5c2d91'} />
                      <path d="M0,22 h7 v7 h-7 z M1,23 h5 v5 h-5 z M2,24 h3 v3 h-3 z" fill={selectedMethod === 'ESEWA' ? '#60bb46' : '#5c2d91'} />
                      <path d="M22,22 h5 v5 h-5 z M23,23 h3 v3 h-3 z" fill="#0f172a" />
                      <path d="M9,0 h2 v1 h-2 z M13,0 h3 v1 h-3 z M17,0 h1 v2 h-1 z M19,0 h2 v1 h-2 z M9,2 h1 v3 h-1 z M11,3 h2 v1 h-2 z M15,2 h2 v2 h-2 z M18,3 h3 v1 h-3 z M9,5 h3 v1 h-3 z M14,5 h2 v2 h-2 z M18,5 h1 v1 h-1 z M20,6 h1 v1 h-1 z" fill="#0f172a" />
                      <path d="M0,9 h2 v1 h-2 z M3,9 h1 v1 h-1 z M6,9 h1 v2 h-1 z M9,9 h2 v2 h-2 z M13,9 h2 v1 h-2 z M17,9 h1 v3 h-1 z M19,10 h2 v1 h-2 z M22,9 h4 v1 h-4 z M27,9 h2 v1 h-2 z" fill="#0f172a" />
                      <path d="M0,12 h1 v1 h-1 z M2,12 h3 v1 h-3 z M7,13 h1 v2 h-1 z M10,12 h2 v2 h-2 z M14,12 h1 v1 h-1 z M16,13 h2 v1 h-2 z M20,12 h1 v1 h-1 z M23,12 h3 v1 h-3 z M28,12 h1 v2 h-1 z" fill="#0f172a" />
                      <path d="M0,15 h3 v1 h-3 z M4,16 h2 v1 h-2 z M8,15 h1 v2 h-1 z M11,16 h2 v1 h-2 z M15,15 h1 v1 h-1 z M18,15 h3 v1 h-3 z M22,15 h1 v1 h-1 z M25,16 h3 v1 h-3 z" fill="#0f172a" />
                      <path d="M9,18 h2 v1 h-2 z M13,18 h1 v1 h-1 z M16,18 h3 v1 h-3 z M21,18 h1 v2 h-1 z M24,18 h4 v1 h-4 z" fill="#0f172a" />
                      <path d="M9,20 h1 v1 h-1 z M11,21 h3 v1 h-3 z M16,20 h2 v2 h-2 z M19,21 h1 v1 h-1 z M24,20 h2 v1 h-2 z M27,21 h2 v1 h-2 z" fill="#0f172a" />
                      <path d="M9,23 h2 v1 h-2 z M12,24 h2 v1 h-2 z M16,23 h3 v1 h-3 z M20,24 h1 v1 h-1 z M15,26 h3 v1 h-3 z M20,27 h1 v1 h-1 z M10,27 h3 v1 h-3 z" fill="#0f172a" />
                      <rect x="11.5" y="11.5" width="6" height="6" fill={selectedMethod === 'ESEWA' ? '#60bb46' : '#5c2d91'} rx="1.5" />
                      <text x="14.5" y="15.8" fontSize="4.5" fontWeight="900" fill="white" textAnchor="middle" fontFamily="sans-serif">
                        {selectedMethod === 'ESEWA' ? 'eS' : 'Kh'}
                      </text>
                    </svg>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">Scan this QR Code via your {selectedMethod === 'ESEWA' ? 'eSewa' : 'Khalti'} App</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Instant digital QR processing is supported for this authorized merchant.</p>
                  </div>

                  <button
                    id="btn-confirm-qr-payment"
                    type="button"
                    onClick={() => {
                      setStep('PROCESSING');
                      setTimeout(() => {
                        setStep('SUCCESS');
                      }, 2000);
                    }}
                    className={`w-full py-2.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                      selectedMethod === 'ESEWA' ? 'bg-[#60bb46] hover:bg-[#52a03b]' : 'bg-[#5c2d91] hover:bg-[#4d257a]'
                    }`}
                  >
                    Confirm QR Scan & Pay {formatNPR(transaction.finalAmount)}
                  </button>
                  <span className="text-[10px] text-slate-400 text-center block mt-1 font-medium">
                    🔒 Secure Settlement Connection — No real wallet balances will be modified.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleGatewaySubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        {selectedMethod === 'ESEWA' ? 'eSewa ID (Mobile Number)' : 'Khalti ID (Mobile Number)'}
                      </label>
                      <input
                        type="text"
                        placeholder="98XXXXXXXX"
                        value={credentials.mobileNumber}
                        onChange={(e) => setCredentials({ ...credentials, mobileNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Enter any 10-digit test mobile number starting with 9</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        {selectedMethod === 'ESEWA' ? 'eSewa Password / MPIN' : 'Khalti MPIN (4 Digits)'}
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <button
                      id="btn-confirm-secure-payment"
                      type="submit"
                      className={`w-full py-2.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                        selectedMethod === 'ESEWA'
                          ? 'bg-[#60bb46] hover:bg-[#52a03b]'
                          : 'bg-[#5c2d91] hover:bg-[#4d257a]'
                      }`}
                    >
                      Settle {formatNPR(transaction.finalAmount)} (Secure Testnet)
                    </button>
                    <span className="text-[10px] text-slate-400 text-center block mt-2 font-medium">
                      🔒 Encrypted Testnet Connection — No real funds will be charged.
                    </span>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Step 3: Processing Animation */}
          {step === 'PROCESSING' && (
            <div className="py-12 text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-4 border-red-100 border-t-red-600 animate-spin" />
                <CreditCard className="w-5 h-5 text-red-600 absolute" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Authorizing Secure Wallet</h4>
                <p className="text-xs text-slate-500 mt-1">Verifying credentials and initiating secure ledger hook...</p>
              </div>
            </div>
          )}

          {/* Step 4: Success state */}
          {step === 'SUCCESS' && (
            <div className="py-8 text-center space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-200 relative">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
                <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-black text-slate-900 text-lg uppercase tracking-wide text-emerald-600">Payment Succeeded!</h4>
                <p className="text-xs text-slate-600 px-4">
                  The transaction has been successfully processed. The listing status is updated to <span className="font-bold text-emerald-600">SOLD</span>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 max-w-xs mx-auto text-left text-xs space-y-1 text-slate-500">
                <div><span className="font-bold text-slate-700">Receipt No:</span> BH-{Math.floor(100000 + Math.random() * 900000)}</div>
                <div><span className="font-bold text-slate-700">Gateway:</span> {selectedMethod} Gateway</div>
                <div><span className="font-bold text-slate-700">Status:</span> PAID & SECURED</div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-dismiss-success-payment"
                  onClick={() => {
                    if (selectedMethod) {
                      onPaymentSuccess(transaction.id, selectedMethod);
                    }
                  }}
                  className="px-6 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
