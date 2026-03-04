import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';

interface AddressResult {
  formatted: string;
  lat: number;
  lng: number;
  stateCode: string;
  placeId: string;
}

interface Props {
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
    __googleMapsLoaded?: boolean;
    __googleMapsCallbacks?: (() => void)[];
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    if (window.__googleMapsCallbacks) {
      window.__googleMapsCallbacks.push(() => resolve());
      return;
    }
    window.__googleMapsCallbacks = [() => resolve()];

    if (!apiKey) {
      reject(new Error('Google Maps API key not configured'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.__googleMapsCallbacks?.forEach(cb => cb());
      window.__googleMapsCallbacks = undefined;
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

function extractStateCode(place: any): string {
  const components = place.address_components || [];
  for (const comp of components) {
    if (comp.types?.includes('administrative_area_level_1')) {
      return comp.short_name || '';
    }
  }
  return '';
}

interface Prediction {
  description: string;
  place_id: string;
  _lat?: number;
  _lng?: number;
  _state?: string;
}

const AddressAutocomplete = ({ onSelect, placeholder = 'Enter your property address...', className }: Props) => {
  const { key: googleMapsKey, loading: keyLoading } = useGoogleMapsKey();
  const [value, setValue] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState(false);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number>(0);
  const nominatimMode = useRef(false);

  const fetchNominatimSuggestions = async (input: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&addressdetails=1&limit=5&countrycodes=us`
      );
      const data = await res.json();
      if (data.length > 0) {
        nominatimMode.current = true;
        setPredictions(data.map((d: any) => ({
          description: d.display_name,
          place_id: `nom_${d.place_id}`,
          _lat: parseFloat(d.lat),
          _lng: parseFloat(d.lon),
          _state: d.address?.state || '',
        })));
        setShowDropdown(true);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch {
      setPredictions([]);
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    if (keyLoading) return;
    loadGoogleMaps(googleMapsKey)
      .then(() => {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        // Create a hidden div for PlacesService
        const div = document.createElement('div');
        placesService.current = new window.google.maps.places.PlacesService(div);
        setMapsReady(true);
      })
      .catch(() => setMapsError(true));
  }, [keyLoading, googleMapsKey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchPredictions = useCallback((input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      return;
    }

    // If Google Maps isn't available, use Nominatim autocomplete
    if (!autocompleteService.current) {
      fetchNominatimSuggestions(input);
      return;
    }

    // Set a timeout — if Google doesn't respond in 2s, fall back to Nominatim
    let responded = false;
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        fetchNominatimSuggestions(input);
      }
    }, 2000);

    autocompleteService.current.getPlacePredictions(
      {
        input,
        types: ['address'],
        componentRestrictions: { country: 'us' },
      },
      (results: Prediction[] | null, status: string) => {
        if (responded) return;
        responded = true;
        clearTimeout(timeout);
        if (status === 'OK' && results && results.length > 0) {
          nominatimMode.current = false;
          setPredictions(results.slice(0, 5));
          setShowDropdown(true);
        } else {
          fetchNominatimSuggestions(input);
        }
      }
    );
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchPredictions(v), 250);
  };

  const handleSelect = (prediction: Prediction) => {
    setShowDropdown(false);
    setValue(prediction.description);

    // Nominatim result — already has coordinates
    if (prediction.place_id.startsWith('nom_') && prediction._lat != null && prediction._lng != null) {
      const stateCode = prediction._state?.length === 2
        ? prediction._state.toUpperCase()
        : getStateCode(prediction._state || '');
      onSelect({
        formatted: prediction.description,
        lat: prediction._lat,
        lng: prediction._lng,
        stateCode,
        placeId: '',
      });
      return;
    }

    // Google Places result
    setLoading(true);
    placesService.current?.getDetails(
      { placeId: prediction.place_id, fields: ['geometry', 'formatted_address', 'address_components'] },
      (place: any, status: string) => {
        setLoading(false);
        if (status === 'OK' && place?.geometry?.location) {
          onSelect({
            formatted: place.formatted_address || prediction.description,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            stateCode: extractStateCode(place),
            placeId: prediction.place_id,
          });
        }
      }
    );
  };

  // Fallback: Nominatim geocoding if Google Maps isn't available
  const handleFallbackSearch = async () => {
    if (!value.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, address: addr, display_name } = data[0];
        const state = addr?.state || '';
        const stateCode = state.length === 2 ? state.toUpperCase() : getStateCode(state);
        onSelect({
          formatted: display_name || value,
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          stateCode,
          placeId: '',
        });
      } else {
        onSelect({ formatted: value, lat: 40.7128, lng: -74.006, stateCode: 'NY', placeId: '' });
      }
    } catch {
      onSelect({ formatted: value, lat: 40.7128, lng: -74.006, stateCode: 'NY', placeId: '' });
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (predictions.length > 0) {
        handleSelect(predictions[0]);
      } else {
        handleFallbackSearch();
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative flex-1 ${className || ''}`}>
      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        className="flex h-14 w-full rounded-md border border-input bg-background pl-10 pr-10 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {/* Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-popover-foreground transition-colors hover:bg-accent/20"
              onClick={() => handleSelect(p)}
            >
              <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="truncate">{p.description}</span>
            </button>
          ))}
          {/* Attribution */}
          <div className="flex items-center justify-end border-t border-border/50 px-3 py-1.5">
            <span className="text-[10px] text-muted-foreground">
              {nominatimMode.current ? 'Powered by OpenStreetMap' : 'Powered by Google'}
            </span>
          </div>
        </div>
      )}

      {mapsError && !mapsReady && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Type an address and select from suggestions to continue
        </p>
      )}
    </div>
  );
};

function getStateCode(stateName: string): string {
  const map: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    'District of Columbia': 'DC',
  };
  if (stateName.length === 2) return stateName.toUpperCase();
  return map[stateName] || 'NY';
}

export default AddressAutocomplete;
