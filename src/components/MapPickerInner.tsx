'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// Fix for default marker icons
let brandIcon: any;

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  brandIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

interface MapPickerInnerProps {
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number, address: string) => void;
  onCancel: () => void;
  title?: string;
}

// UniUyo Coordinates as fallback
const UNIUYO_CENTER = { lat: 5.038, lng: 7.915 };

function LocationMarker({ position, setPosition }: { position: any, setPosition: any }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={brandIcon} />
  );
}

function MapUpdater({ center }: { center: any }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15);
  }, [center, map]);
  return null;
}

export default function MapPickerInner({ initialLat, initialLng, onConfirm, onCancel, title = "Select Location" }: MapPickerInnerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    position || UNIUYO_CENTER
  );
  
  const [address, setAddress] = useState(position ? 'Loading address...' : '');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Reverse geocode when position changes
  useEffect(() => {
    if (!position) return;
    
    let isMounted = true;
    const geocode = async () => {
      setIsGeocoding(true);
      try {
        // Appended email to avoid 403 Access Denied from Nominatim
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18&addressdetails=1&email=hello@errandrun.com`);
        const data = await res.json();
        if (data && data.display_name && isMounted) {
          const shortName = data.display_name.split(',').slice(0, 3).join(',');
          setAddress(shortName);
        } else if (isMounted) {
          setAddress('Selected Location');
        }
      } catch (error) {
        console.error("Geocoding failed", error);
        if (isMounted) setAddress('Selected Location (Reverse Geocode Failed)');
      } finally {
        if (isMounted) setIsGeocoding(false);
      }
    };

    const timer = setTimeout(() => {
      geocode();
    }, 800); // Debounce API calls

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [position]);

  // Handle Search Forward Geocoding
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&email=hello@errandrun.com`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition({ lat, lng });
        setCenter({ lat, lng });
        setAddress(data[0].display_name.split(',').slice(0, 3).join(','));
      } else {
        alert('Location not found. Try a different search term.');
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-dark-base/90 flex flex-col backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-dark-base border-b border-white/10 shrink-0">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-blue" />
          {title}
        </h2>
        <button type="button" onClick={onCancel} className="text-white/60 hover:text-white font-bold p-2">
          Cancel
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-dark-base p-4 border-b border-white/10 shrink-0 flex gap-2 items-center">
        <div className="flex-1">
          <Input 
            type="text" 
            placeholder="Search for a campus landmark..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isGeocoding}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </Button>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative w-full bg-dark-secondary overflow-hidden">
        <MapContainer 
          center={center} 
          zoom={15} 
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
          {center && <MapUpdater center={center} />}
        </MapContainer>

        {/* Center Target overlay instruction */}
        {!position && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[400]">
            <div className="bg-brand-blue/90 text-white px-5 py-2.5 rounded-full font-bold text-sm backdrop-blur-md shadow-xl border border-brand-blue/20 animate-pulse">
              Tap anywhere on the map to drop a pin
            </div>
          </div>
        )}
      </div>

      {/* Footer / Confirm */}
      <div className="bg-dark-base p-6 border-t border-white/10 shrink-0 flex flex-col gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 mt-1">
            <MapPin className="w-5 h-5 text-brand-blue" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-brand-blue font-bold uppercase tracking-wider mb-1">Selected Location</p>
            {/* Allow manual edit of the address if reverse geocoding fails or is inaccurate */}
            <input 
               type="text" 
               className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue mb-1"
               value={isGeocoding ? 'Finding address...' : address}
               onChange={(e) => setAddress(e.target.value)}
               disabled={isGeocoding}
            />
            {position && (
              <p className="text-white/40 text-[10px] font-mono mt-1">
                {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        <button 
          type="button"
          onClick={() => {
            if (position) {
              onConfirm(position.lat, position.lng, address);
            }
          }}
          disabled={!position || isGeocoding || !address}
          className="btn-primary w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 border-emerald-500 disabled:opacity-50 py-3.5 text-base"
        >
          <Check className="w-5 h-5" /> Confirm Location
        </button>
      </div>
    </div>
  );
}
