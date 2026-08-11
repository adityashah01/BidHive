import { Category, User, Listing, Bid, Review, Notification, Report } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-elec', name: 'Electronics & Gadgets', slug: 'electronics', icon: '💻' },
  { id: 'cat-vehi', name: 'Bikes & Scooters', slug: 'vehicles', icon: '🏍️' },
  { id: 'cat-hand', name: 'Traditional & Handicrafts', slug: 'handicrafts', icon: '🏺' },
  { id: 'cat-trek', name: 'Trekking & Adventure Gear', slug: 'trekking', icon: '🏔️' },
  { id: 'cat-inst', name: 'Musical Instruments', slug: 'instruments', icon: '🪘' },
  { id: 'cat-app',  name: 'Home Appliances', slug: 'appliances', icon: '🏠' },
  { id: 'cat-book', name: 'Books & Literature', slug: 'books', icon: '📚' },
  { id: 'cat-fash', name: 'Fashion & Clothing', slug: 'clothing', icon: '👕' }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-aditya',
    name: 'Aditya Sharma',
    email: 'aditya.shh15@gmail.com',
    role: 'BIDDER',
    sellerRating: 4.8,
    sellerRatingCount: 15,
    buyerReliabilityScore: 98,
    isBanned: false,
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-smriti',
    name: 'Smriti Shrestha',
    email: 'smriti.shrestha@gmail.com',
    role: 'SELLER',
    sellerRating: 4.9,
    sellerRatingCount: 24,
    buyerReliabilityScore: 100,
    isBanned: false,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-nischal',
    name: 'Nischal Basnet',
    email: 'nischal.b@gmail.com',
    role: 'BIDDER',
    sellerRating: 4.2,
    sellerRatingCount: 5,
    buyerReliabilityScore: 90,
    isBanned: false,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-pemba',
    name: 'Pemba Sherpa',
    email: 'pemba.sherpa@gmail.com',
    role: 'SELLER',
    sellerRating: 5.0,
    sellerRatingCount: 38,
    buyerReliabilityScore: 100,
    isBanned: false,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-admin',
    name: 'BidHive Admin',
    email: 'admin@bidhive.com.np',
    role: 'ADMIN',
    sellerRating: 5.0,
    sellerRatingCount: 0,
    buyerReliabilityScore: 100,
    isBanned: false,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  }
];

// Seed listings with Nepal theme
export const INITIAL_LISTINGS: Listing[] = [
  {
    id: 'lst-bike',
    sellerId: 'usr-pemba',
    sellerName: 'Pemba Sherpa',
    title: 'Pre-owned Royal Enfield Himalayan 411cc (Excellent Condition)',
    description: 'Selling my reliable companion that has successfully climbed up to Muktinath and Upper Mustang. Mechanically pristine, regularly serviced at the authorized Royal Enfield service center in Chabahil, Kathmandu. Comes with custom crash guards, metal panniers, and mobile charger setup. Tax paid up to FY 81/82. Lot 92 Pa.',
    categoryId: 'cat-vehi',
    condition: 'GOOD',
    startingPrice: 320000,
    reservePrice: 350000,
    buyNowPrice: 395000,
    currentPrice: 345000,
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Started 1 day ago
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),   // Ending in 2 hours
    status: 'ACTIVE',
    viewCount: 245,
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-bowl',
    sellerId: 'usr-smriti',
    sellerName: 'Smriti Shrestha',
    title: 'Antique Hand-Beaten 7-Metal Tibetan Singing Bowl',
    description: 'Authentic 7-metal hand-beaten therapeutic singing bowl obtained from Patan, Lalitpur. Weighs approximately 1.4 kg. Produces deep, resonant, and sustained harmonic tones (G# note, associated with the Throat Chakra). Includes hand-carved rosewood mallet wrapped in suede and a silk cushion. Excellent for meditation, yoga studios, or sound healing practitioners.',
    categoryId: 'cat-hand',
    condition: 'LIKE_NEW',
    startingPrice: 8500,
    reservePrice: 12000,
    buyNowPrice: 16000,
    currentPrice: 11500,
    startTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // Started 12 hrs ago
    endTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),       // Ending in 45 mins
    status: 'ACTIVE',
    viewCount: 112,
    images: [
      'https://images.unsplash.com/photo-1603006905393-21a48c9bf727?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-gear',
    sellerId: 'usr-pemba',
    sellerName: 'Pemba Sherpa',
    title: 'Everest Expedition Trekking Down Jacket & Sleeping Bag Bundle',
    description: 'High-altitude expedition-grade bundle consisting of (1) -20°C North Face Summit Series Down Jacket (Large) and (2) Marmot -30°C goose down sleeping bag. Both items were used only once during an Island Peak expedition and are professionally dry-cleaned. Perfect for anyone planning the Annapurna Circuit, Manaslu Trek, or Everest Base Camp this upcoming season. Selling at a bargain fraction of Kathmandu retail pricing!',
    categoryId: 'cat-trek',
    condition: 'LIKE_NEW',
    startingPrice: 18000,
    reservePrice: 22000,
    buyNowPrice: 26000,
    currentPrice: 21500,
    startTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // Ending in 4 days
    status: 'ACTIVE',
    viewCount: 89,
    images: [
      'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1486916856992-e4db22c8df33?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-madal',
    sellerId: 'usr-nischal',
    sellerName: 'Nischal Basnet',
    title: 'Professional Khair-Wood Nepalese Madal (Choyaa Gajara)',
    description: 'A masterpiece crafted from seasoned Khair wood with hand-made leather drums using authentic ox hide and special black masala tuning paste. It is a Choyaa Gajara type madal with beautiful high-end resonance and deep bass. Ideal for recording, live stages, or Dashain/Tihar celebration. Handcrafted by traditional makers in Bhaktapur.',
    categoryId: 'cat-inst',
    condition: 'NEW',
    startingPrice: 4500,
    reservePrice: 5500,
    buyNowPrice: 7000,
    currentPrice: 4500,
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Ending in 2 days
    status: 'ACTIVE',
    viewCount: 43,
    images: [
      'https://images.unsplash.com/photo-1543443258-92b04ad5ec6b?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-camera',
    sellerId: 'usr-aditya',
    sellerName: 'Aditya Sharma',
    title: 'Fujifilm X-T30 Mirrorless Camera with 18-55mm Kit Lens',
    description: 'Immaculate Fujifilm X-T30 camera with the highly acclaimed 18-55mm f/2.8-4 OIS lens. Purchased from New Road, Kathmandu. Includes 2 original batteries, chargers, a 64GB high-speed SD card, and a protective leather half-case. Shutter count is only 8,400. Amazing film simulations, outstanding ergonomics, and perfect for street/travel photography in the Valley!',
    categoryId: 'cat-elec',
    condition: 'LIKE_NEW',
    startingPrice: 85000,
    reservePrice: 95000,
    buyNowPrice: 110000,
    currentPrice: 98000,
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Active live auction
    status: 'ACTIVE', // Made live for bidding
    viewCount: 312,
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-dhaka',
    sellerId: 'usr-smriti',
    sellerName: 'Smriti Shrestha',
    title: 'Pure Palpali Dhaka Traditional Kurta & Dupatta Set',
    description: 'An elegant handwoven traditional Dhaka outfit, directly sourced from Tansen, Palpa. Pure cotton base with brilliant geometric patterns. Features beautiful hand-stitched borders. Size: Medium. Brand new, never worn. Ready for active bidding on BidHive!',
    categoryId: 'cat-fash',
    condition: 'NEW',
    startingPrice: 5000,
    reservePrice: 6000,
    buyNowPrice: 8500,
    currentPrice: 5000,
    startTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // Started 12 hours ago
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Ends in 3 days
    status: 'ACTIVE',
    viewCount: 45,
    images: [
      'https://images.unsplash.com/photo-1621847468516-1ee7d0786b28?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-oneplus',
    sellerId: 'usr-aditya',
    sellerName: 'Aditya Sharma',
    title: 'OnePlus Nord CE 3 Lite 5G (8GB/256GB, Pastel Lime)',
    description: 'Superb condition phone, used for 6 months. Bought from authorized OnePlus store in Tamrakar House, New Road. Complete box, original 67W SuperVOOC charger, and bill are available. Screen protector and protective cover applied from Day 1. Moving to iPhone, so putting up for auction.',
    categoryId: 'cat-elec',
    condition: 'GOOD',
    startingPrice: 14000,
    reservePrice: 16000,
    buyNowPrice: 19500,
    currentPrice: 15500,
    startTime: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    viewCount: 168,
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-vespa',
    sellerId: 'usr-smriti',
    sellerName: 'Smriti Shrestha',
    title: 'Vespa LX 125 Sport (Matte Red) - Kathmandu Lot 82',
    description: 'Selling my stylish Vespa LX 125, matte red finish. Regularly serviced at Vespa Nepal showroom, Lalitpur. Driven 14,200 km mostly for office commute within Lalitpur/Kathmandu. Single-handed use, pristine engine performance, brand new tires replaced last month. All documents clear, road tax paid fully for the fiscal year.',
    categoryId: 'cat-vehi',
    condition: 'GOOD',
    startingPrice: 130000,
    reservePrice: 145000,
    buyNowPrice: 165000,
    currentPrice: 135000,
    startTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    viewCount: 312,
    images: [
      'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-jhyal',
    sellerId: 'usr-pemba',
    sellerName: 'Pemba Sherpa',
    title: 'Traditional Newari Wood-Carved Jhyal (Window) Frame',
    description: 'Stunning handcrafted Newari traditional window (Sanjhya) hand-carved in seasoned local Saaj wood by master craftsmen in Bhaktapur. Features intricate carvings of peacocks, deities, and floral patterns. A perfect statement piece for home decor, hotel lobbies, or heritage restoration. Brings classical Kathmandu valley architecture to your space.',
    categoryId: 'cat-hand',
    condition: 'NEW',
    startingPrice: 45000,
    reservePrice: 50000,
    buyNowPrice: 65000,
    currentPrice: 45000,
    startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    viewCount: 94,
    images: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-poles',
    sellerId: 'usr-pemba',
    sellerName: 'Pemba Sherpa',
    title: 'Leki Makalu Lite Trekking Poles (Pair) & Garmin GPS Bundle',
    description: 'Original Leki Makalu aluminum anti-shock trekking poles paired with a Garmin eTrex 10 handheld GPS. Both items are in flawless working condition, imported from Europe. Perfect for high-altitude trekking in Annapurna, Langtang, or Everest regions. Lightweight, sturdy, and highly reliable under harsh mountain weather.',
    categoryId: 'cat-trek',
    condition: 'GOOD',
    startingPrice: 9500,
    reservePrice: 11000,
    buyNowPrice: 14000,
    currentPrice: 10000,
    startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    viewCount: 76,
    images: [
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-sarangi',
    sellerId: 'usr-nischal',
    sellerName: 'Nischal Basnet',
    title: 'Handmade Premium Nepali Sarangi (Ganesh Carved)',
    description: 'Masterfully hand-carved Sarangi made from high-grade Khirra wood by traditional Gaine makers in Pokhara. Features a beautiful Ganesh carving at the top scroll, goat skin drum base, and high-tension strings. Produces rich, soulful, traditional Nepalese tunes. Comes with professional horsehair bow and custom soft carrying case.',
    categoryId: 'cat-inst',
    condition: 'NEW',
    startingPrice: 8000,
    reservePrice: 9500,
    buyNowPrice: 12000,
    currentPrice: 8500,
    startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    viewCount: 52,
    images: [
      'https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-cgmicrowave',
    sellerId: 'usr-nischal',
    sellerName: 'Nischal Basnet',
    title: 'CG 20L Solo Microwave Oven (CG-MW2001)',
    description: 'CG (Chaudhary Group) 20 Liters Solo Microwave Oven. Extremely reliable, energy efficient, and in like-new condition. Bought from CG Digital showroom in Kumaripati, Lalitpur. Excellent for quick reheating, defrosting, and light cooking. Moving out of Kathmandu Valley, so selling all kitchen items.',
    categoryId: 'cat-app',
    condition: 'GOOD',
    startingPrice: 4500,
    reservePrice: 5000,
    buyNowPrice: 7500,
    currentPrice: 4700,
    startTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    viewCount: 39,
    images: [
      'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-nepalbooks',
    sellerId: 'usr-smriti',
    sellerName: 'Smriti Shrestha',
    title: 'Vintage Nepal History Collection (Hardcover Book Bundle)',
    description: "An exquisite collection of vintage historical books about Nepal, including 'The Rise of the House of Gorkha', 'Nepal: A Cultural History', and older memoirs of Everest expeditions. Hardcover editions with beautiful historical photographs and maps. Excellent addition to any local library, historian's collection, or antique book collector in Nepal.",
    categoryId: 'cat-book',
    condition: 'GOOD',
    startingPrice: 3000,
    reservePrice: 4000,
    buyNowPrice: 5500,
    currentPrice: 3200,
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    viewCount: 61,
    images: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lst-pashmina',
    sellerId: 'usr-pemba',
    sellerName: 'Pemba Sherpa',
    title: 'Exclusive Pure Cashmere Pashmina Shawl (Deep Crimson)',
    description: 'A premium, 100% pure Chyangra Pashmina shawl in elegant deep crimson. Handcrafted and hand-spun in a local boutique factory in Lalitpur, certified with the Chyangra Pashmina hallmark of quality. Outstandingly soft, warm, and luxurious. Brand new, in original gift packaging. Ideal for luxury styling or international gifting.',
    categoryId: 'cat-fash',
    condition: 'NEW',
    startingPrice: 12000,
    reservePrice: 15000,
    buyNowPrice: 18000,
    currentPrice: 12000,
    startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    viewCount: 115,
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_BIDS: Bid[] = [
  // Bids for RE Bike
  {
    id: 'bid-1',
    listingId: 'lst-bike',
    bidderId: 'usr-aditya',
    bidderName: 'Aditya Sharma',
    amount: 325000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-2',
    listingId: 'lst-bike',
    bidderId: 'usr-nischal',
    bidderName: 'Nischal Basnet',
    amount: 330000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-3',
    listingId: 'lst-bike',
    bidderId: 'usr-aditya',
    bidderName: 'Aditya Sharma',
    amount: 340000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-4',
    listingId: 'lst-bike',
    bidderId: 'usr-nischal',
    bidderName: 'Nischal Basnet',
    amount: 345000,
    isAutoBid: true,
    placedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },

  // Bids for Singing Bowl
  {
    id: 'bid-5',
    listingId: 'lst-bowl',
    bidderId: 'usr-aditya',
    bidderName: 'Aditya Sharma',
    amount: 90000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-6',
    listingId: 'lst-bowl',
    bidderId: 'usr-nischal',
    bidderName: 'Nischal Basnet',
    amount: 10000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-7',
    listingId: 'lst-bowl',
    bidderId: 'usr-aditya',
    bidderName: 'Aditya Sharma',
    amount: 11000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-8',
    listingId: 'lst-bowl',
    bidderId: 'usr-pemba',
    bidderName: 'Pemba Sherpa',
    amount: 11500,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },

  // Bids for Trek Gear
  {
    id: 'bid-9',
    listingId: 'lst-gear',
    bidderId: 'usr-aditya',
    bidderName: 'Aditya Sharma',
    amount: 19000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-10',
    listingId: 'lst-gear',
    bidderId: 'usr-nischal',
    bidderName: 'Nischal Basnet',
    amount: 20000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-11',
    listingId: 'lst-gear',
    bidderId: 'usr-aditya',
    bidderName: 'Aditya Sharma',
    amount: 21500,
    isAutoBid: true,
    placedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },

  // Bids for camera (ended)
  {
    id: 'bid-12',
    listingId: 'lst-camera',
    bidderId: 'usr-nischal',
    bidderName: 'Nischal Basnet',
    amount: 90000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-13',
    listingId: 'lst-camera',
    bidderId: 'usr-pemba',
    bidderName: 'Pemba Sherpa',
    amount: 95000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'bid-14',
    listingId: 'lst-camera',
    bidderId: 'usr-nischal',
    bidderName: 'Nischal Basnet',
    amount: 98000,
    isAutoBid: false,
    placedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    transactionId: 'txn-camera',
    reviewerId: 'usr-nischal',
    reviewerName: 'Nischal Basnet',
    revieweeId: 'usr-aditya',
    rating: 5,
    comment: 'Aditya is an excellent seller! The camera was exactly as described, neatly packaged with all accessories. Process was smooth and highly trustworthy.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rev-2',
    transactionId: 'txn-past-1',
    reviewerId: 'usr-aditya',
    reviewerName: 'Aditya Sharma',
    revieweeId: 'usr-pemba',
    rating: 5,
    comment: 'Bought trekking gear from Pemba earlier. Genuine person, highly knowledgeable about mountain equipment, and very fair pricing.',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'not-1',
    userId: 'usr-aditya',
    type: 'OUTBID',
    message: 'You have been outbid on "Pre-owned Royal Enfield Himalayan 411cc". New bid: NPR 345,000.',
    isRead: false,
    link: 'lst-bike',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'not-2',
    userId: 'usr-nischal',
    type: 'AUCTION_WON',
    message: 'Congratulations! You won the auction for "Fujifilm X-T30 Mirrorless Camera" with a bid of NPR 98,000.',
    isRead: false,
    link: 'lst-camera',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  },
  {
    id: 'not-3',
    userId: 'usr-aditya',
    type: 'PAYMENT_RECEIVED',
    message: 'Payment of NPR 98,000 received for "Fujifilm X-T30 Mirrorless Camera". Please ship the item.',
    isRead: true,
    link: 'lst-camera',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  }
];

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep-1',
    reporterId: 'usr-nischal',
    reporterName: 'Nischal Basnet',
    listingId: 'lst-bike',
    listingTitle: 'Pre-owned Royal Enfield Himalayan 411cc',
    reason: 'Suspiciously low price for the model year. Suspected tax clearance fraud.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  }
];
