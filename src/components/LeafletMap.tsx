import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';

interface LeafletMapProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  readonly?: boolean;
  onChange?: (lat: number, lng: number, name: string) => void;
}

// Famous locations in Nepal for quick select
const NEPAL_PRESETS = [
  { name: 'Kathmandu (New Road / Durbar Square)', lat: 27.7035, lng: 85.3090 },
  { name: 'Lalitpur (Patan Durbar Square)', lat: 27.6727, lng: 85.3252 },
  { name: 'Bhaktapur (Durbar Square)', lat: 27.6722, lng: 85.4278 },
  { name: 'Pokhara (Lakeside)', lat: 28.2096, lng: 83.9587 },
  { name: 'Chitwan (Narayangarh)', lat: 27.6833, lng: 84.4333 },
  { name: 'Butwal (Traffic Chowk)', lat: 27.7006, lng: 83.4484 },
  { name: 'Dharan (Bhanuchowk)', lat: 26.8124, lng: 87.2834 },
];

export default function LeafletMap({
  latitude = 27.700769, // Default to Kathmandu Central
  longitude = 85.316853,
  locationName = 'Kathmandu, Nepal',
  readonly = false,
  onChange,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [currentLat, setCurrentLat] = useState(latitude);
  const [currentLng, setCurrentLng] = useState(longitude);
  const [currentName, setCurrentName] = useState(locationName);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);

  // Dynamic loading of Leaflet script and stylesheet
  useEffect(() => {
    let isMounted = true;
    const mapDivId = `leaflet-map-${Math.floor(Math.random() * 100000)}`;
    if (containerRef.current) {
      containerRef.current.id = mapDivId;
    }

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !containerRef.current) return;

      try {
        // Destroy existing map if any
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Initialize Leaflet Map
        const map = L.map(containerRef.current.id).setView([currentLat, currentLng], 14);
        mapInstanceRef.current = map;

        // OpenStreetMap tile layer (beautiful light styled layer)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);

        // Custom Red Marker Pin Icon (Leaflet default icons sometimes break in builds)
        const customIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          html: `
            <div class="flex items-center justify-center">
              <div class="w-8 h-8 bg-red-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-bounce">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <circle cx="12" cy="11" r="3" fill="white"></circle>
                </svg>
              </div>
              <div class="absolute w-2 h-2 bg-red-800 rounded-full blur-xs mt-8"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        // Add Marker
        const marker = L.marker([currentLat, currentLng], { icon: customIcon }).addTo(map);
        markerRef.current = marker;

        // If interactive (readonly = false)
        if (!readonly) {
          map.on('click', (e: any) => {
            const { lat, lng } = e.latlng;
            updateLocation(lat, lng);
          });
        }

        setMapLoaded(true);
      } catch (err) {
        console.error('Leaflet initialization failed:', err);
      }
    };

    // Load CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load JS
    if (!(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        if (isMounted) initMap();
      };
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update pin and inputs
  const updateLocation = (lat: number, lng: number, manualName?: string) => {
    setCurrentLat(lat);
    setCurrentLng(lng);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 14);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }

    // Guess or generate name based on closest preset or generic
    let calculatedName = manualName || `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    // Check if close to preset
    if (!manualName) {
      const closest = NEPAL_PRESETS.find(p => {
        const dist = Math.sqrt(Math.pow(p.lat - lat, 2) + Math.pow(p.lng - lng, 2));
        return dist < 0.015; // roughly 1.5 km
      });
      if (closest) {
        calculatedName = `Near ${closest.name.replace(' (', ', ').replace(')', '')}`;
      } else {
        calculatedName = `Selected Site (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`;
      }
    }

    setCurrentName(calculatedName);
    if (onChange) {
      onChange(lat, lng, calculatedName);
    }
  };

  // Preset click
  const handlePresetClick = (preset: typeof NEPAL_PRESETS[0]) => {
    updateLocation(preset.lat, preset.lng, preset.name);
  };

  // Search address (Nepal-focused quick mockup search)
    const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Kathmandu, Nepal')}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        updateLocation(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name.split(',')[0] + ', Kathmandu');
      } else {
        const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Nepal')}&limit=1`);
        const data2 = await res2.json();
        if (data2 && data2.length > 0) {
          updateLocation(parseFloat(data2[0].lat), parseFloat(data2[0].lon), data2[0].display_name.split(',')[0]);
        } else {
          // Fallback
          const latOffset = (Math.random() - 0.5) * 0.04;
          const lngOffset = (Math.random() - 0.5) * 0.04;
          updateLocation(27.700769 + latOffset, 85.316853 + lngOffset, `${searchQuery} (Approximate)`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Header for Seller Map Setup */}
      {!readonly && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Nepal location (e.g., Koteshwor, Lakeside Pokhara...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:ring-1 focus:ring-red-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Locate
            </button>
          </div>

          {/* Quick Preset Badges */}
          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto py-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase shrink-0 self-center mr-1">Nepal Presets:</span>
            {NEPAL_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handlePresetClick(p)}
                className="px-2 py-0.5 border border-slate-200 hover:border-red-500 bg-white rounded-full text-[9px] font-bold text-slate-600 hover:text-red-600 transition-colors cursor-pointer shrink-0"
              >
                {p.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actual Map Container */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
        <div ref={containerRef} className="w-full h-56 md:h-64 lg:h-72" style={{ zIndex: 10 }} />
        
        {/* Loading overlay if map scripts are still downloading */}
        {!mapLoaded && (
          <div className="absolute inset-0 bg-slate-50/80 flex flex-col items-center justify-center gap-2 z-30">
            <Navigation className="w-5 h-5 text-red-600 animate-spin" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Interactive Map of Nepal...</span>
          </div>
        )}

        {/* Display Current Coordinates / Location overlay at bottom */}
        <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs px-3 py-2 border border-slate-200/80 rounded-lg flex items-center gap-2 shadow-md z-20">
          <MapPin className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
          <div className="min-w-0 flex-1 leading-normal">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Physical Collection Point</span>
            <span className="block text-xs font-extrabold text-slate-800 truncate leading-tight mt-0.5">
              {currentName}
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
            {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
          </span>
        </div>
      </div>

      {!readonly && (
        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1 flex items-center gap-1">
          <span className="text-red-500">★</span> Click anywhere on the map or select a preset to position the red location pin. Bidders will see this to collect their physical goods.
        </p>
      )}
    </div>
  );
}
