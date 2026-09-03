'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Check,
  Search,
  X,
  Compass,
  Navigation,
  Building2,
  BookOpen,
  Coffee,
  BedDouble,
  GraduationCap,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ── Fix for Leaflet default icon paths in Next.js ─────────────────────────────
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
    iconSize: [28, 45],
    iconAnchor: [14, 45],
    popupAnchor: [1, -38],
    shadowSize: [45, 45],
  });
}

// ── Definitive Campus Landmark Database ───────────────────────────────────────
// Pre-populated specific buildings and key spots for high-accuracy campus location resolution
interface CampusLandmark {
  id: string;
  name: string;
  campus: 'Main Campus' | 'Town Campus' | 'Annex Campus';
  category: 'gate' | 'faculty' | 'hostel' | 'library' | 'food' | 'admin' | 'medical';
  lat: number;
  lng: number;
  tag: string;
}

const CAMPUS_LANDMARKS: CampusLandmark[] = [
  // ── Main Campus (Nwaniba Road / Use Offot) ──
  {
    id: 'mc-gate',
    name: 'Main Campus Gate (Security Post)',
    campus: 'Main Campus',
    category: 'gate',
    lat: 5.0385,
    lng: 7.9892,
    tag: 'Main Entrance & Cab Park'
  },
  {
    id: 'mc-lib',
    name: 'University Central Library',
    campus: 'Main Campus',
    category: 'library',
    lat: 5.0392,
    lng: 7.9880,
    tag: 'E-Library & Study Hub'
  },
  {
    id: 'mc-eng',
    name: 'Faculty of Engineering Complex',
    campus: 'Main Campus',
    category: 'faculty',
    lat: 5.0410,
    lng: 7.9865,
    tag: 'Civil/Mech/Elect Depts'
  },
  {
    id: 'mc-sci',
    name: 'Faculty of Science & Laboratories',
    campus: 'Main Campus',
    category: 'faculty',
    lat: 5.0398,
    lng: 7.9872,
    tag: 'Science Quadrangle'
  },
  {
    id: 'mc-cafe',
    name: 'Campus Central Cafeteria & Food Hub',
    campus: 'Main Campus',
    category: 'food',
    lat: 5.0405,
    lng: 7.9878,
    tag: 'Student Food Court'
  },
  {
    id: 'mc-hall12',
    name: 'Male Hostels (Hall 1 & Hall 2)',
    campus: 'Main Campus',
    category: 'hostel',
    lat: 5.0425,
    lng: 7.9840,
    tag: 'Undergraduate Residence'
  },
  {
    id: 'mc-hall34',
    name: 'Female Hostels (Hall 3 & Hall 4)',
    campus: 'Main Campus',
    category: 'hostel',
    lat: 5.0430,
    lng: 7.9860,
    tag: 'Female Quads'
  },
  {
    id: 'mc-hall6',
    name: 'New Hostel (Hall 6)',
    campus: 'Main Campus',
    category: 'hostel',
    lat: 5.0438,
    lng: 7.9870,
    tag: 'Hostel Complex'
  },
  {
    id: 'mc-cbn',
    name: 'CBN Centre of Excellence / Auditoriums',
    campus: 'Main Campus',
    category: 'admin',
    lat: 5.0388,
    lng: 7.9860,
    tag: 'Lecture Theaters'
  },
  {
    id: 'mc-etf',
    name: 'ETF Lecture Hall Complex',
    campus: 'Main Campus',
    category: 'faculty',
    lat: 5.0402,
    lng: 7.9850,
    tag: 'Multi-purpose Lecture Halls'
  },
  {
    id: 'mc-admin',
    name: 'Student Affairs & Senate Building',
    campus: 'Main Campus',
    category: 'admin',
    lat: 5.0390,
    lng: 7.9890,
    tag: 'Bursary & Administration'
  },
  {
    id: 'mc-health',
    name: 'University Health Centre (Clinic)',
    campus: 'Main Campus',
    category: 'medical',
    lat: 5.0370,
    lng: 7.9875,
    tag: 'Campus Medical Clinic'
  },
  {
    id: 'mc-agric',
    name: 'Faculty of Agriculture',
    campus: 'Main Campus',
    category: 'faculty',
    lat: 5.0418,
    lng: 7.9880,
    tag: 'Agric Pavilion & Farms'
  },
  {
    id: 'mc-sports',
    name: 'University Sports Complex & Stadium',
    campus: 'Main Campus',
    category: 'admin',
    lat: 5.0360,
    lng: 7.9895,
    tag: 'Sports Ground'
  },

  // ── Town Campus (Ikpa Road) ──
  {
    id: 'tc-gate',
    name: 'Town Campus Main Gate (Ikpa Road)',
    campus: 'Town Campus',
    category: 'gate',
    lat: 5.0450,
    lng: 7.9220,
    tag: 'Ikpa Road Gate'
  },
  {
    id: 'tc-arts',
    name: 'Faculty of Arts & Humanities',
    campus: 'Town Campus',
    category: 'faculty',
    lat: 5.0460,
    lng: 7.9210,
    tag: 'Onyema Hall & Depts'
  },
  {
    id: 'tc-law',
    name: 'Faculty of Law Complex',
    campus: 'Town Campus',
    category: 'faculty',
    lat: 5.0445,
    lng: 7.9230,
    tag: 'Moot Court & Law Library'
  },
  {
    id: 'tc-pg',
    name: 'Postgraduate School (PG School)',
    campus: 'Town Campus',
    category: 'admin',
    lat: 5.0465,
    lng: 7.9205,
    tag: 'PG Directorate'
  },
  {
    id: 'tc-print',
    name: 'Ikpa Road Printing & Photocopy Hub',
    campus: 'Town Campus',
    category: 'food',
    lat: 5.0440,
    lng: 7.9228,
    tag: 'Business Centre & Cybercafe'
  },

  // ── Annex Campus ──
  {
    id: 'ax-gate',
    name: 'Annex Campus Gate',
    campus: 'Annex Campus',
    category: 'gate',
    lat: 5.0360,
    lng: 7.9350,
    tag: 'Business/Environmental Gate'
  },
  {
    id: 'ax-bus',
    name: 'Faculty of Business Administration',
    campus: 'Annex Campus',
    category: 'faculty',
    lat: 5.0368,
    lng: 7.9360,
    tag: 'Accounting & Marketing'
  },
];

// Helper: Calculate distance between two lat/lng in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find closest campus landmark within 350 meters
function findNearestLandmark(lat: number, lng: number): { landmark: CampusLandmark; distance: number } | null {
  let closest: CampusLandmark | null = null;
  let minDistance = Infinity;

  for (const lm of CAMPUS_LANDMARKS) {
    const dist = getDistanceMeters(lat, lng, lm.lat, lm.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = lm;
    }
  }

  if (closest && minDistance < 350) {
    return { landmark: closest, distance: Math.round(minDistance) };
  }
  return null;
}

interface MapPickerInnerProps {
  initialLat?: number;
  initialLng?: number;
  onConfirm?: (lat: number, lng: number, address: string) => void;
  onSelect?: (lat: number, lng: number, address: string) => void;
  onCancel?: () => void;
  title?: string;
}

// Default center: Main Campus
const DEFAULT_CENTER = { lat: 5.0392, lng: 7.9880 };

function LocationMarker({
  position,
  setPosition,
}: {
  position: { lat: number; lng: number } | null;
  setPosition: (pos: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position === null ? null : <Marker position={position} icon={brandIcon} />;
}

function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { duration: 0.8 });
  }, [center, map]);
  return null;
}

export default function MapPickerInner({
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
  title = 'Pinpoint Campus Location',
}: MapPickerInnerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    position || DEFAULT_CENTER
  );

  const [address, setAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ name: string; lat: number; lng: number; campus?: string }>
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeCampusFilter, setActiveCampusFilter] = useState<'all' | 'Main Campus' | 'Town Campus'>('all');

  // Search filter across predefined campus landmarks
  const filteredLandmarks = useMemo(() => {
    if (!searchQuery.trim()) {
      if (activeCampusFilter === 'all') return CAMPUS_LANDMARKS.slice(0, 8);
      return CAMPUS_LANDMARKS.filter((l) => l.campus === activeCampusFilter);
    }
    const q = searchQuery.toLowerCase();
    return CAMPUS_LANDMARKS.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.campus.toLowerCase().includes(q) ||
        l.tag.toLowerCase().includes(q)
    );
  }, [searchQuery, activeCampusFilter]);

  // When user drops or drags pin, compute landmark proximity + reverse geocoding
  useEffect(() => {
    if (!position) return;

    let isMounted = true;
    setIsGeocoding(true);

    const nearest = findNearestLandmark(position.lat, position.lng);

    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18&addressdetails=1&email=support@errandrun.ng`
        );
        const data = await res.json();

        if (isMounted) {
          if (nearest && nearest.distance < 60) {
            // Right on top of the landmark
            setAddress(`${nearest.landmark.name}, ${nearest.landmark.campus}`);
          } else if (nearest) {
            // Close to landmark
            setAddress(
              `Near ${nearest.landmark.name} (~${nearest.distance}m), ${nearest.landmark.campus}`
            );
          } else if (data?.display_name) {
            const shortAddress = data.display_name.split(',').slice(0, 3).join(',').trim();
            setAddress(shortAddress);
          } else {
            setAddress(`Campus Location (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`);
          }
        }
      } catch {
        if (isMounted) {
          if (nearest) {
            setAddress(`${nearest.landmark.name}, ${nearest.landmark.campus}`);
          } else {
            setAddress(`Campus Spot (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`);
          }
        }
      } finally {
        if (isMounted) setIsGeocoding(false);
      }
    };

    const timer = setTimeout(geocode, 400);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [position]);

  // Select a landmark from chips or dropdown
  const selectLandmark = (item: { name: string; lat: number; lng: number; campus?: string }) => {
    setPosition({ lat: item.lat, lng: item.lng });
    setCenter({ lat: item.lat, lng: item.lng });
    setAddress(`${item.name}${item.campus ? `, ${item.campus}` : ''}`);
    setShowDropdown(false);
    setSearchQuery('');
  };

  // Perform OSM search if query is not in predefined database
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    if (filteredLandmarks.length > 0) {
      selectLandmark(filteredLandmarks[0]);
      return;
    }

    setIsGeocoding(true);
    try {
      // Prioritize Uyo region
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ', Uyo, Nigeria'
        )}&limit=5&email=support@errandrun.ng`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        setPosition({ lat, lng });
        setCenter({ lat, lng });
        setAddress(first.display_name.split(',').slice(0, 3).join(',').trim());
        setShowDropdown(false);
      } else {
        alert('Location not found. Try searching for a known campus building or hostel.');
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setCenter({ lat, lng });
      },
      () => {
        alert('Unable to retrieve your current location. Please allow location permissions.');
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[92vh] max-h-[820px] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white transition-colors">

        {/* ── MODAL HEADER ── */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                {title}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Click map to drop pin or pick a specific campus landmark below.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SEARCH & LANDMARK COMMAND BAR ── */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Search campus spot (e.g. Engineering, Central Library, Hall 6, Cafe...)"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="font-bold text-xs shrink-0 px-4"
            >
              Search
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleGetCurrentLocation}
              className="text-xs font-bold shrink-0 hidden sm:flex items-center gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              title="Locate Me"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              My GPS
            </Button>

            {/* Instant Landmark Search Dropdown */}
            {showDropdown && filteredLandmarks.length > 0 && (
              <div className="absolute top-12 left-0 right-0 z-[600] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                <div className="p-2 bg-slate-50 dark:bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Verified Campus Landmarks
                </div>
                {filteredLandmarks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectLandmark(item)}
                    className="w-full p-3 text-left hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                        {item.category === 'library' ? <BookOpen className="w-3.5 h-3.5" /> :
                         item.category === 'food' ? <Coffee className="w-3.5 h-3.5" /> :
                         item.category === 'hostel' ? <BedDouble className="w-3.5 h-3.5" /> :
                         item.category === 'gate' ? <Shield className="w-3.5 h-3.5" /> :
                         <Building2 className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.campus} • {item.tag}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      Snap to Pin ➔
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Quick-Pick Landmark Chips Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1 hidden sm:inline">
              Quick Snaps:
            </span>
            {[
              { id: 'mc-gate', label: '🏛️ Main Gate', lat: 5.0385, lng: 7.9892, name: 'Main Campus Gate' },
              { id: 'mc-lib', label: '📚 Library', lat: 5.0392, lng: 7.9880, name: 'University Central Library' },
              { id: 'mc-eng', label: '⚙️ Engineering', lat: 5.0410, lng: 7.9865, name: 'Faculty of Engineering' },
              { id: 'mc-cafe', label: '🍲 Cafeteria', lat: 5.0405, lng: 7.9878, name: 'Campus Central Cafeteria' },
              { id: 'mc-hostel', label: '🛏️ Hostels (Hall 1-6)', lat: 5.0425, lng: 7.9840, name: 'Main Campus Hostels' },
              { id: 'tc-gate', label: '📍 Town Gate (Ikpa)', lat: 5.0450, lng: 7.9220, name: 'Town Campus Gate' },
              { id: 'tc-law', label: '⚖️ Faculty of Law', lat: 5.0445, lng: 7.9230, name: 'Faculty of Law (Town)' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => selectLandmark(chip)}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-all shrink-0 whitespace-nowrap shadow-sm"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── INTERACTIVE LEAFLET MAP (CRISP OPENSTREETMAP TILES) ── */}
        <div className="flex-1 relative w-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
          <MapContainer
            center={center}
            zoom={16}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            {/* Standard Free OpenStreetMap Tiles — ZERO API KEY WATERMARK */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
            {center && <MapUpdater center={center} />}
          </MapContainer>

          {/* Center Instruction Banner */}
          {!position && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-[400]">
              <div className="bg-slate-900/90 text-white px-4 py-2 rounded-full font-bold text-xs backdrop-blur-md shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                Tap anywhere on the campus map to drop pin
              </div>
            </div>
          )}
        </div>

        {/* ── MODAL FOOTER & CONFIRM PANEL ── */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Definite Selected Location
                </span>
                {isGeocoding && (
                  <span className="text-[10px] text-amber-500 font-bold animate-pulse">
                    (Locking coordinates…)
                  </span>
                )}
              </div>

              {/* Editable Location Name */}
              <div className="mt-1">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isGeocoding ? 'Calculating campus landmark…' : 'Tap on map or pick landmark above'}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {position && (
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                  GPS: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="font-semibold text-xs border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                size="lg"
                disabled={!position || isGeocoding || !address.trim()}
                onClick={() => {
                  if (position) {
                    if (onConfirm) onConfirm(position.lat, position.lng, address.trim());
                    if (onSelect) onSelect(position.lat, position.lng, address.trim());
                  }
                }}
                className="font-black text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1.5 px-6"
              >
                <Check className="w-4 h-4" />
                Confirm Location
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
