'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Check } from 'lucide-react';

// Fix for default marker icons in Leaflet when using Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Brand Icon
const brandIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapPickerInnerProps {
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number, address: string) => void;
  onCancel: () => void;
  title?: string;
}

// UniUyo Coordinates (Town Campus roughly)
const UNIUYO_CENTER = { lat: 5.038, lng: 7.915 };

function LocationMarker({ position, setPosition }: { position: any, setPosition: any }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={brandIcon}></Marker>
  );
}

export default function MapPickerInner({ initialLat, initialLng, onConfirm, onCancel, title = "Select Location" }: MapPickerInnerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : UNIUYO_CENTER
  );
  const [address, setAddress] = useState('Selected on Map');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Reverse geocode when position changes
  useEffect(() => {
    if (!position) return;
    
    const geocode = async () => {
      setIsGeocoding(true);
      try {
        // Use Nominatim open-source reverse geocoding
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18&addressdetails=1`);
        const data = await res.json();
        if (data && data.display_name) {
          // Keep it short, just first two segments
          const shortName = data.display_name.split(',').slice(0, 2).join(',');
          setAddress(shortName);
        }
      } catch (error) {
        console.error("Geocoding failed", error);
      } finally {
        setIsGeocoding(false);
      }
    };

    const timer = setTimeout(() => {
      geocode();
    }, 1000); // Debounce API calls

    return () => clearTimeout(timer);
  }, [position]);

  return (
    <div className="fixed inset-0 z-[100] bg-dark-base/90 flex flex-col backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-dark-base border-b border-white/10 shrink-0">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-blue" />
          {title}
        </h2>
        <button onClick={onCancel} className="text-white/60 hover:text-white font-bold p-2">
          Cancel
        </button>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative w-full bg-dark-secondary">
        <MapContainer 
          center={position || UNIUYO_CENTER} 
          zoom={15} 
          scrollWheelZoom={true} 
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>

        {/* Center Target Reticle overlay instruction */}
        {!position && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[400]">
            <div className="bg-dark-base/80 text-white px-4 py-2 rounded-full font-bold text-sm backdrop-blur-md">
              Tap anywhere on the map to drop a pin
            </div>
          </div>
        )}
      </div>

      {/* Footer / Confirm */}
      <div className="bg-dark-base p-6 border-t border-white/10 shrink-0 flex flex-col gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
            <p className="text-xs text-brand-blue font-bold uppercase tracking-wider mb-1">Selected Location</p>
            <p className="text-white font-medium text-sm">
              {isGeocoding ? 'Finding address...' : address}
            </p>
            {position && (
              <p className="text-white/40 text-[10px] font-mono mt-1">
                {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        <button 
          onClick={() => {
            if (position) {
              onConfirm(position.lat, position.lng, address);
            }
          }}
          disabled={!position || isGeocoding}
          className="btn-primary w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green/80 disabled:opacity-50"
        >
          <Check className="w-5 h-5" /> Confirm Location
        </button>
      </div>
    </div>
  );
}
