'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom Icons
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Pulsing animated icon for the Runner
const runnerIcon = L.divIcon({
  className: 'custom-runner-icon',
  html: `<div class="relative w-6 h-6">
          <div class="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-75"></div>
          <div class="absolute inset-1 bg-purple-600 border-2 border-white rounded-full shadow-lg"></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

interface Location {
  lat: number;
  lng: number;
}

export interface LiveErrandRadarInnerProps {
  pickup: Location;
  dropoff: Location;
  runnerPosition?: Location | null;
}

// Component to auto-fit bounds
function MapBoundsFitter({ pickup, dropoff, runnerPosition }: LiveErrandRadarInnerProps) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([pickup, dropoff]);
    if (runnerPosition) bounds.extend(runnerPosition);
    
    map.fitBounds(bounds, { padding: [50, 50], animate: true });
  }, [map, pickup, dropoff, runnerPosition]);

  return null;
}

export default function LiveErrandRadarInner({ pickup, dropoff, runnerPosition }: LiveErrandRadarInnerProps) {
  // Center defaults to pickup
  const center: [number, number] = [pickup.lat, pickup.lng];

  return (
    <div className="w-full h-full min-h-[400px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={true} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapBoundsFitter pickup={pickup} dropoff={dropoff} runnerPosition={runnerPosition} />

        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup className="font-sans font-bold text-slate-900">Pickup Location</Popup>
        </Marker>

        <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
          <Popup className="font-sans font-bold text-slate-900">Drop-off Location</Popup>
        </Marker>

        {runnerPosition && (
          <Marker position={[runnerPosition.lat, runnerPosition.lng]} icon={runnerIcon}>
            <Popup className="font-sans font-bold text-purple-600">Runner Location (Live)</Popup>
          </Marker>
        )}

        <Polyline 
          positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} 
          color="#94a3b8" 
          weight={2} 
          dashArray="5, 10" 
          opacity={0.5} 
        />
      </MapContainer>
    </div>
  );
}
