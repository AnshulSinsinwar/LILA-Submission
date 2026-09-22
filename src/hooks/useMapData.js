import { useState, useEffect, useRef } from 'react';
import { MAP_CONFIG } from '../utils/constants';

/**
 * Hook to fetch and cache map JSON data.
 * Lazy-loads: only fetches when map is selected.
 */
export function useMapData(selectedMap) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cache = useRef({});

  useEffect(() => {
    if (!selectedMap || !MAP_CONFIG[selectedMap]) return;

    // Check cache
    if (cache.current[selectedMap]) {
      setData(cache.current[selectedMap]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const config = MAP_CONFIG[selectedMap];
        const response = await fetch(config.jsonFile);
        if (!response.ok) throw new Error(`Failed to load ${config.jsonFile}`);
        const json = await response.json();
        cache.current[selectedMap] = json;
        setData(json);
      } catch (err) {
        setError(err.message);
        console.error('Failed to load map data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMap]);

  return { data, loading, error };
}

/**
 * Hook to fetch metadata.json on app load.
 */
export function useMetadata() {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/metadata.json')
      .then(r => r.json())
      .then(setMetadata)
      .catch(err => console.error('Failed to load metadata:', err))
      .finally(() => setLoading(false));
  }, []);

  return { metadata, loading };
}
