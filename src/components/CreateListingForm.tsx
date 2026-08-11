import React, { useState } from 'react';
import { Category, Condition, Listing } from '../types';
import { Upload, X, Check, MapPin } from 'lucide-react';
import LeafletMap from './LeafletMap';

interface CreateListingFormProps {
  categories: Category[];
  onSubmit: (listingData: Partial<Listing>) => void;
  onCancel: () => void;
}

const STOCK_NEPAL_PRESETS = [
  { name: 'Royal Enfield Bike', url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800' },
  { name: 'Singing Bowl', url: 'https://images.unsplash.com/photo-1603006905393-21a48c9bf727?w=800' },
  { name: 'Trekking Pack', url: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800' },
  { name: 'Traditional Dhaka', url: 'https://images.unsplash.com/photo-1621847468516-1ee7d0786b28?w=800' },
  { name: 'Fuji Camera', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800' },
  { name: 'MacBook Pro', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800' }
];

export default function CreateListingForm({ categories, onSubmit, onCancel }: CreateListingFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    categoryId: categories[0]?.id || '',
    condition: 'GOOD' as Condition,
    startingPrice: '',
    reservePrice: '',
    buyNowPrice: '',
    durationDays: '3',
    description: '',
    imageUrls: [] as string[],
    locationName: 'Kathmandu, Nepal',
    latitude: 27.700769,
    longitude: 85.316853,
  });

  const [errorMsg, setErrorMsg] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.title.trim()) {
      setErrorMsg('Please enter a descriptive title.');
      return;
    }
    if (!formData.description.trim()) {
      setErrorMsg('Please write a clear description of the item state.');
      return;
    }
    
    const startP = parseFloat(formData.startingPrice);
    if (isNaN(startP) || startP <= 0) {
      setErrorMsg('Starting price must be a valid positive amount in NPR.');
      return;
    }

    let reserveP = undefined;
    if (formData.reservePrice) {
      reserveP = parseFloat(formData.reservePrice);
      if (isNaN(reserveP) || reserveP < startP) {
        setErrorMsg('Reserve price must be greater than or equal to starting price.');
        return;
      }
    }

    let buyNowP = undefined;
    if (formData.buyNowPrice) {
      buyNowP = parseFloat(formData.buyNowPrice);
      if (isNaN(buyNowP) || buyNowP <= startP) {
        setErrorMsg('Buy Now price must be strictly greater than starting price.');
        return;
      }
    }

    const finalImages = formData.imageUrls.length > 0
      ? formData.imageUrls
      : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'];

    const durationMs = parseInt(formData.durationDays) * 24 * 60 * 60 * 1000;
    const endTime = new Date(Date.now() + durationMs).toISOString();

    onSubmit({
      title: formData.title,
      categoryId: formData.categoryId,
      condition: formData.condition,
      startingPrice: startP,
      reservePrice: reserveP,
      buyNowPrice: buyNowP,
      currentPrice: startP,
      startTime: new Date().toISOString(),
      endTime,
      description: formData.description,
      images: finalImages,
      locationName: formData.locationName,
      latitude: formData.latitude,
      longitude: formData.longitude,
      status: 'ACTIVE'
    });
  };

  const addPresetImage = (url: string) => {
    if (formData.imageUrls.length >= 5) {
      setErrorMsg('You can add up to 5 images maximum.');
      return;
    }
    if (!formData.imageUrls.includes(url)) {
      setFormData({
        ...formData,
        imageUrls: [...formData.imageUrls, url]
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, idx) => idx !== index)
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formData.imageUrls.length + files.length > 5) {
      setErrorMsg('You can attach up to 5 images maximum.');
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({
            ...prev,
            imageUrls: [...prev.imageUrls, reader.result as string]
          }));
        }
      };
      reader.readAsDataURL(file as any);
    });
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-6 max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#18181B]">List an Item for Auction</h2>
          <p className="text-xs text-[#6B7280]">Provide clear details and photos for Nepali bidders.</p>
        </div>
        <button
          onClick={onCancel}
          className="p-1 text-[#6B7280] hover:text-[#18181B] rounded transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-6 text-xs">
        
        {/* Section 1: Product Information */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[#18181B] border-b border-[#E5E7EB] pb-1">
            1. Product Information
          </h3>

          <div className="space-y-1">
            <label className="block font-semibold text-[#18181B]">Listing Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Royal Enfield Himalayan Lot 92 Pa with metal panniers"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-semibold text-[#18181B]">Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs text-[#18181B] bg-white focus:outline-none focus:border-[#D99000]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-[#18181B]">Item Condition *</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as Condition })}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs text-[#18181B] bg-white focus:outline-none focus:border-[#D99000]"
              >
                <option value="NEW">New (Seal Packed)</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good Condition</option>
                <option value="FAIR">Fair / Used</option>
                <option value="POOR">Poor / Salvage</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-semibold text-[#18181B]">Detailed Description *</label>
            <textarea
              required
              rows={4}
              placeholder="Describe the condition, usage history, defects, included accessories..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 border border-[#E5E7EB] rounded-lg text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
            />
          </div>
        </div>

        {/* Section 2: Images */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[#18181B] border-b border-[#E5E7EB] pb-1">
            2. Product Images
          </h3>

          <div className="space-y-2">
            <div className="relative border border-dashed border-[#E5E7EB] rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-5 h-5 text-[#6B7280] mx-auto mb-1" />
              <span className="font-semibold text-[#18181B]">Upload Photos</span>
              <span className="block text-[11px] text-[#6B7280]">PNG, JPG up to 5MB (Max 5 photos)</span>
            </div>

            {/* Presets fallback */}
            <div className="space-y-1">
              <span className="text-[11px] text-[#6B7280]">Or select a preset photo:</span>
              <div className="flex flex-wrap gap-1.5">
                {STOCK_NEPAL_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addPresetImage(preset.url)}
                    className="px-2 py-1 bg-[#F7F7F5] border border-[#E5E7EB] rounded hover:border-[#D99000] text-[#18181B] font-medium"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Images List */}
            {formData.imageUrls.length > 0 && (
              <div className="grid grid-cols-5 gap-2 pt-2">
                {formData.imageUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square border border-[#E5E7EB] rounded overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-0.5 bg-black/70 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Pricing & Duration */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[#18181B] border-b border-[#E5E7EB] pb-1">
            3. Pricing & Duration (NPR)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block font-semibold text-[#18181B]">Starting Price (Rs) *</label>
              <input
                type="number"
                required
                min="10"
                placeholder="e.g. 1000"
                value={formData.startingPrice}
                onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#18181B] focus:outline-none focus:border-[#D99000]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-[#18181B]">Reserve Price (Optional)</label>
              <input
                type="number"
                placeholder="e.g. 1500"
                value={formData.reservePrice}
                onChange={(e) => setFormData({ ...formData, reservePrice: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#18181B] focus:outline-none focus:border-[#D99000]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-[#18181B]">Buy Now Price (Optional)</label>
              <input
                type="number"
                placeholder="e.g. 3000"
                value={formData.buyNowPrice}
                onChange={(e) => setFormData({ ...formData, buyNowPrice: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#18181B] focus:outline-none focus:border-[#D99000]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-semibold text-[#18181B]">Auction Duration *</label>
            <select
              value={formData.durationDays}
              onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs text-[#18181B] bg-white focus:outline-none focus:border-[#D99000]"
            >
              <option value="1">1 Day</option>
              <option value="3">3 Days</option>
              <option value="5">5 Days</option>
              <option value="7">7 Days</option>
            </select>
          </div>
        </div>

        {/* Section 4: Location */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[#18181B] border-b border-[#E5E7EB] pb-1">
            4. Location & Handover
          </h3>

          <div className="space-y-1">
            <label className="block font-semibold text-[#18181B]">Location Name</label>
            <input
              type="text"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs text-[#18181B] focus:outline-none focus:border-[#D99000]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#18181B] hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-[#D99000] hover:bg-[#B87500] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Submit Listing for Review
          </button>
        </div>

      </form>
    </div>
  );
}
