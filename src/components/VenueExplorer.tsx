import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import {
  Search, MapPin, Building, Users, ExternalLink,
  Loader2, AlertCircle, RefreshCw, Globe, LayoutDashboard
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OsmVenue {
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    amenity?: string;
    tourism?: string;
    leisure?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    capacity?: string;
    website?: string;
    phone?: string;
    description?: string;
  };
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
  return null;
}

function getVenueType(tags: OsmVenue['tags']): string {
  if (tags.amenity === 'event_venue') return 'Event Venue';
  if (tags.amenity === 'banquet_hall') return 'Banquet Hall';
  if (tags.tourism === 'hotel') return 'Hotel';
  if (tags.amenity === 'conference_centre') return 'Conference Centre';
  if (tags.leisure === 'resort') return 'Resort';
  return 'Venue';
}

function getVenueImgQuery(tags: OsmVenue['tags']): string {
  if (tags.amenity === 'banquet_hall') return 'banquet,hall,wedding,india';
  if (tags.tourism === 'hotel') return 'hotel,luxury,india';
  if (tags.amenity === 'conference_centre') return 'conference,centre,india';
  return 'event,venue,hall,india';
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'event_venue', label: 'Event Halls' },
  { key: 'banquet_hall', label: 'Banquet' },
  { key: 'hotel', label: 'Hotels' },
  { key: 'conference_centre', label: 'Conference' },
];

const QUICK_CITIES = ['Hyderabad', 'Mumbai', 'Jaipur', 'Goa', 'Bangalore', 'Delhi', 'Chennai', 'Udaipur'];

export default function VenueExplorer() {
  const [destination, setDestination] = useState('');
  const [searching, setSearching] = useState(false);
  const [venues, setVenues] = useState<OsmVenue[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [zoom, setZoom] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [filter, setFilter] = useState('all');
  const [searched, setSearched] = useState(false);
  const [searchedCity, setSearchedCity] = useState('');

  const filtered = venues.filter(v => {
    if (filter === 'all') return true;
    if (filter === 'hotel') return v.tags.tourism === 'hotel';
    return v.tags.amenity === filter;
  });

  const searchVenues = useCallback(async (city?: string) => {
    const query = city || destination;
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setVenues([]);
    setSearched(true);
    setSearchedCity(query);

    try {
      // 1. Geocode with Nominatim (free, no key)
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'EventHivexApp/1.0' } }
      );
      const geoData = await geoRes.json();

      if (!geoData.length) {
        setError('Location not found. Try a city like "Mumbai" or "Hyderabad".');
        setSearching(false);
        return;
      }

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);
      setMapCenter([lat, lon]);
      setZoom(13);

      // 2. Fetch real venues from Overpass API (free, no key)
      const overpassQuery = `[out:json][timeout:30];
(
  node["amenity"="event_venue"](around:15000,${lat},${lon});
  node["amenity"="banquet_hall"](around:15000,${lat},${lon});
  node["tourism"="hotel"](around:15000,${lat},${lon});
  node["amenity"="conference_centre"](around:15000,${lat},${lon});
  way["amenity"="event_venue"](around:15000,${lat},${lon});
  way["amenity"="banquet_hall"](around:15000,${lat},${lon});
  way["tourism"="hotel"](around:15000,${lat},${lon});
);
out center;`;

      const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
      });
      const ovData = await ovRes.json();

      const results: OsmVenue[] = (ovData.elements || [])
        .filter((el: any) => {
          const hasName = !!el.tags?.name;
          const hasCoords = (el.type === 'node' && el.lat && el.lon) ||
            (el.type === 'way' && el.center?.lat && el.center?.lon);
          return hasName && hasCoords;
        })
        .map((el: any) => ({
          id: el.id,
          lat: el.type === 'node' ? el.lat : el.center.lat,
          lon: el.type === 'node' ? el.lon : el.center.lon,
          tags: el.tags || {},
        }))
        .slice(0, 48);

      setVenues(results);
      if (results.length === 0) {
        setError('No venues found nearby. Try a larger city or different destination.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setSearching(false);
    }
  }, [destination]);

  const handleQuickCity = (city: string) => {
    setDestination(city);
    searchVenues(city);
  };

  return (
    <div className="pt-32 pb-24 px-8 max-w-7xl mx-auto min-h-screen soft-bg">
      {/* Header */}
      <div className="mb-12 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-[1px] bg-brand-accent/20" />
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-muted">Live Venue Explorer</span>
        </div>
        <h1 className="text-6xl font-display font-bold text-brand-text leading-[1.1] tracking-tight">
          Discover Venues<br />
          <span className="text-brand-accent font-medium">For Any Destination.</span>
        </h1>
        <p className="text-brand-muted text-lg max-w-xl leading-relaxed">
          Search any city across India to find real event venues, banquet halls, hotels, and conference centres — powered by OpenStreetMap.
        </p>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow max-w-2xl">
          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-accent" />
          <input
            type="text"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchVenues()}
            placeholder="Search destination... (e.g. Hyderabad, Jaipur, Goa)"
            className="w-full pl-14 pr-5 py-5 bg-brand-surface border border-brand-border text-brand-text rounded-2xl focus:outline-none focus:border-brand-accent transition-all placeholder:text-brand-muted/40 text-sm font-semibold shadow-sm"
          />
        </div>
        <button
          onClick={() => searchVenues()}
          disabled={searching || !destination.trim()}
          className="flex items-center justify-center gap-3 px-8 py-5 bg-brand-accent text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:shadow-lg hover:shadow-brand-accent/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          {searching ? 'Searching...' : 'Find Venues'}
        </button>
      </div>

      {/* Quick city pills */}
      <div className="flex flex-wrap gap-2 mb-10">
        {QUICK_CITIES.map(city => (
          <button
            key={city}
            onClick={() => handleQuickCity(city)}
            className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-muted text-[10px] font-black uppercase tracking-widest rounded-full hover:border-brand-accent/40 hover:text-brand-accent transition-all"
          >
            {city}
          </button>
        ))}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm font-semibold text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {searched && !searching && venues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                  {filtered.length} Venues Found
                </span>
              </div>
              <span className="text-brand-muted text-xs font-semibold">near {searchedCity}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-brand-surface p-1 rounded-xl border border-brand-border">
                <button
                  onClick={() => setView('grid')}
                  className={cn('px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
                    view === 'grid' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text')}
                >
                  <LayoutDashboard className="w-3 h-3" /> Grid
                </button>
                <button
                  onClick={() => setView('map')}
                  className={cn('px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
                    view === 'map' ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text')}
                >
                  <Globe className="w-3 h-3" /> Map
                </button>
              </div>
              <button
                onClick={() => searchVenues()}
                className="w-10 h-10 bg-brand-surface border border-brand-border rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn('px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
                  filter === f.key
                    ? 'bg-brand-accent text-white border-brand-accent shadow-lg shadow-brand-accent/20'
                    : 'bg-brand-surface text-brand-muted border-brand-border hover:border-brand-accent/30 hover:text-brand-text')}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* MAP VIEW */}
          {view === 'map' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="relative h-[640px] w-full rounded-[32px] overflow-hidden border border-brand-border shadow-2xl"
            >
              <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <ChangeView center={mapCenter} zoom={zoom} />
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
                />
                {filtered.map(venue => (
                  <Marker key={venue.id} position={[venue.lat, venue.lon]}>
                    <Popup maxWidth={280}>
                      <div style={{ width: '260px', fontFamily: 'Inter, sans-serif', borderRadius: '12px', overflow: 'hidden' }}>
                        {/* Image */}
                        <div style={{ height: '130px', margin: '-14px -20px 0', overflow: 'hidden', borderRadius: '8px 8px 0 0' }}>
                          <img
                            src={`https://loremflickr.com/520/260/${getVenueImgQuery(venue.tags)}?lock=${venue.id % 1000}`}
                            alt={venue.tags.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.src = `https://loremflickr.com/520/260/event,venue?lock=${venue.id % 1000}`;
                            }}
                          />
                        </div>
                        {/* Content */}
                        <div style={{ paddingTop: '12px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', background: '#3b82f615', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px' }}>
                            {getVenueType(venue.tags)}
                          </span>
                          <h4 style={{ margin: '8px 0 4px', fontSize: '14px', fontWeight: 800, color: '#111', lineHeight: 1.3 }}>
                            {venue.tags.name}
                          </h4>
                          {(venue.tags['addr:street'] || venue.tags['addr:city']) && (
                            <p style={{ fontSize: '11px', color: '#777', margin: '0 0 10px' }}>
                              📍 {[venue.tags['addr:street'], venue.tags['addr:city']].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {venue.tags.capacity && (
                            <p style={{ fontSize: '11px', color: '#777', margin: '0 0 10px' }}>👥 Capacity: {venue.tags.capacity}</p>
                          )}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((venue.tags.name || '') + ' ' + (venue.tags['addr:city'] || searchedCity))}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '10px', fontWeight: 900, background: '#3b82f6', color: '#fff', padding: '8px 14px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}
                          >
                            📍 Open in Google Maps
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </motion.div>
          )}

          {/* GRID VIEW */}
          {view === 'grid' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((venue, idx) => (
                <motion.div
                  key={venue.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.035, duration: 0.3 }}
                  className="bg-brand-surface rounded-3xl border border-brand-border hover:border-brand-accent/30 transition-all group overflow-hidden flex flex-col"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden shrink-0">
                    <img
                      src={`https://loremflickr.com/640/360/${getVenueImgQuery(venue.tags)}?lock=${venue.id % 1000}`}
                      alt={venue.tags.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-surface/50 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 bg-brand-primary/80 backdrop-blur-md text-brand-accent text-[8px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-brand-border/50">
                        <Building className="w-2.5 h-2.5" /> {getVenueType(venue.tags)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-grow">
                    <h4 className="font-display font-bold text-brand-text text-lg group-hover:text-brand-accent transition-colors mb-2 leading-tight">
                      {venue.tags.name}
                    </h4>
                    {(venue.tags['addr:street'] || venue.tags['addr:city']) && (
                      <p className="text-brand-muted text-xs font-semibold flex items-center gap-1.5 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-brand-accent/60 shrink-0" />
                        {[venue.tags['addr:street'], venue.tags['addr:city']].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {venue.tags.capacity && (
                      <p className="text-brand-muted text-xs font-semibold flex items-center gap-1.5 mb-3">
                        <Users className="w-3.5 h-3.5 text-brand-muted shrink-0" />
                        Capacity: {venue.tags.capacity}
                      </p>
                    )}
                    {venue.tags.description && (
                      <p className="text-brand-muted text-xs leading-relaxed mb-4 italic line-clamp-2">
                        "{venue.tags.description}"
                      </p>
                    )}

                    <div className="mt-auto pt-4 border-t border-brand-border flex gap-3">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((venue.tags.name || '') + ' ' + (venue.tags['addr:city'] || searchedCity))}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-accent text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-brand-accent/20 transition-all active:scale-95"
                      >
                        <MapPin className="w-3.5 h-3.5" /> View on Maps
                      </a>
                      {venue.tags.website && (
                        <a
                          href={venue.tags.website} target="_blank" rel="noopener noreferrer"
                          className="w-12 h-12 bg-brand-primary border border-brand-border rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all"
                          title="Website"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!searched && !searching && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center clean-card">
          <div className="w-24 h-24 bg-brand-surface border border-brand-border flex items-center justify-center mx-auto mb-8 rounded-3xl">
            <Globe className="w-10 h-10 text-brand-accent/30" />
          </div>
          <h3 className="text-3xl font-display font-bold text-brand-text mb-4">Search a Destination</h3>
          <p className="text-brand-muted max-w-md mx-auto text-base leading-relaxed mb-8">
            Type any city above or tap a quick suggestion to instantly discover real event venues on an interactive map.
          </p>
          <p className="text-brand-muted/50 text-[10px] uppercase tracking-widest font-bold">
            Powered by OpenStreetMap · Overpass API · No API key required
          </p>
        </motion.div>
      )}

      {/* Loading state */}
      {searching && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center clean-card">
          <Loader2 className="w-12 h-12 text-brand-accent animate-spin mx-auto mb-6" />
          <h3 className="text-xl font-display font-bold text-brand-text mb-2">Finding Venues...</h3>
          <p className="text-brand-muted text-sm">Searching OpenStreetMap data near {searchedCity}</p>
        </motion.div>
      )}
    </div>
  );
}
