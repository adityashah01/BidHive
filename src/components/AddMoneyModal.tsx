import React, { useState } from 'react';
import { X, Upload, CheckCircle, CreditCard, ShieldCheck } from 'lucide-react';
import { submitWalletTopup } from '../lib/api';
import PaymentQRCode from './PaymentQRCode';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddMoneyModal({ isOpen, onClose }: AddMoneyModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ESEWA');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setScreenshotUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) < 100 || Number(amount) > 100000) {
      setError('Please enter a valid amount between Rs. 100 and Rs. 100,000');
      return;
    }
    if (!transactionId) {
      setError('Please enter the transaction reference ID from eSewa/Khalti');
      return;
    }
    if (!screenshotUrl) {
      setError('Please upload a screenshot of your payment receipt');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await submitWalletTopup({
        amount: Number(amount),
        paymentMethod,
        paymentReference: transactionId,
        paymentScreenshotUrl: screenshotUrl
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit top-up request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-lg w-full max-w-md overflow-hidden relative">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="font-bold text-base text-[#18181B] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#D99000]" />
            Wallet Top-Up via QR Code
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors text-[#6B7280]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          {/* QR Code Section */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#18181B]">1. Scan QR & Transfer Payment</p>
            <PaymentQRCode size={160} showDetails={true} />
          </div>

          <div className="space-y-3 text-xs pt-1">
            <p className="font-bold text-[#18181B]">2. Submit Transaction Reference</p>

            {/* Quick Preset Amount Buttons */}
            <div>
              <label className="block text-xs font-semibold text-[#18181B] mb-1">Select / Enter Top-Up Amount (Rs)</label>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[500, 1000, 2500, 5000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className={`py-1 text-xs font-semibold rounded border transition-colors ${
                      amount === val.toString()
                        ? 'bg-[#18181B] text-white border-[#18181B]'
                        : 'bg-white border-[#E5E7EB] text-[#18181B] hover:bg-gray-100'
                    }`}
                  >
                    Rs. {val.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="100"
                max="100000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#18181B] focus:outline-none focus:border-[#D99000]"
                placeholder="e.g. 2000"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18181B] mb-1">Payment Channel</label>
              <div className="grid grid-cols-3 gap-2">
                {['ESEWA', 'KHALTI', 'BANK_TRANSFER'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 px-1 text-xs font-semibold rounded border ${
                      paymentMethod === method 
                        ? 'bg-[#D99000] text-white border-[#D99000]' 
                        : 'bg-white border-[#E5E7EB] text-[#18181B] hover:bg-gray-50'
                    }`}
                  >
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18181B] mb-1">Transaction / Reference ID</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg font-mono text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
                placeholder="e.g. 0005FDF..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18181B] mb-1">Payment Screenshot</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full border border-dashed rounded-lg p-3 flex items-center justify-center gap-2 ${
                  screenshotUrl ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-[#E5E7EB] bg-gray-50 text-[#6B7280]'
                }`}>
                  {screenshotUrl ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold">Receipt Screenshot Attached</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Receipt Screenshot</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#D99000] hover:bg-[#B87500] text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Submit Payment Reference
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-[#6B7280] mt-2">
              Admin will verify your payment reference and credit equivalent wallet balance.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

