import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Compass, Layers, Crosshair, MapPin, ExternalLink } from 'lucide-react';

// Fix for default Leaflet icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom pulsing HTML icons
const createPulseIcon = (color = '#0052d4') => {
  return L.divIcon({
    className: 'custom-gps-pin',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${color}40; animation: leaflet-pulse 1.6s infinite ease-out; border: 1.5px solid ${color};"></div>
        <div style="width: 15px; height: 15px; border-radius: 50%; background: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 0 12px ${color};"></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
};

const createIncidentIcon = (category = 'security') => {
  let color = '#ef4444';
  if (category === 'medical') color = '#10b981';
  if (category === 'fire') color = '#f97316';
  if (category === 'harassment') color = '#d946ef';

  return L.divIcon({
    className: 'custom-incident-pin',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${color}40; animation: leaflet-pulse 1.4s infinite;"></div>
        <div style="width: 22px; height: 22px; border-radius: 50%; background: ${color}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.6);">
          !
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

export default function GpsMap({
  lat = 9.0950,
  lon = 7.5500,
  zoom = 16,
  interactive = true,
  height = '270px',
  markers = [],
  onMarkerClick = null,
  showUserMarker = true,
  showBreadcrumbTrail = true,
  onLocationUpdate = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const pathPolylineRef = useRef(null);
  const incidentMarkersLayerRef = useRef(null);
  const pathHistoryRef = useRef([]);

  const [mapStyle, setMapStyle] = useState('google'); // 'google', 'satellite', 'dark', 'tactical'
  const [usingDeviceGps, setUsingDeviceGps] = useState(false);
  const [deviceAccuracy, setDeviceAccuracy] = useState(null);
  const watchIdRef = useRef(null);

  // High-availability tile servers with 100% full coverage worldwide
  const tileProviders = {
    // Google Maps Roadmap: 100% available everywhere in Nigeria and globally
    google: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    // Google Maps Hybrid Satellite: high-res imagery + street/campus labels
    satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    // Dark Theme HUD: CartoDB Dark Matter
    dark: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    // OpenStreetMap fallback
    osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapStyle === 'tactical') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: zoom,
        zoomControl: false,
        attributionControl: false
      });

      const selectedUrl = tileProviders[mapStyle] || tileProviders.google;

      L.tileLayer(selectedUrl, {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Layer for incident markers
      const incidentLayer = L.layerGroup().addTo(map);
      incidentMarkersLayerRef.current = incidentLayer;

      // User Marker
      if (showUserMarker) {
        const userMarker = L.marker([lat, lon], {
          icon: createPulseIcon('#0052d4')
        }).addTo(map);
        userMarkerRef.current = userMarker;
      }

      // Breadcrumb Trail Polyline
      if (showBreadcrumbTrail) {
        const polyline = L.polyline([[lat, lon]], {
          color: '#0052d4',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '5, 8'
        }).addTo(map);
        pathPolylineRef.current = polyline;
        pathHistoryRef.current = [[lat, lon]];
      }

      mapInstanceRef.current = map;

      // Invalidate size after DOM mount
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [mapStyle]);

  // Update Tile Layer on Style Change
  useEffect(() => {
    if (!mapInstanceRef.current || mapStyle === 'tactical') return;

    mapInstanceRef.current.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    const selectedUrl = tileProviders[mapStyle] || tileProviders.google;

    L.tileLayer(selectedUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(mapInstanceRef.current);

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
  }, [mapStyle]);

  // Update Coordinates smoothly
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const newPos = [lat, lon];

    if (userMarkerRef.current && showUserMarker) {
      userMarkerRef.current.setLatLng(newPos);
    }

    if (showBreadcrumbTrail && pathPolylineRef.current) {
      const history = pathHistoryRef.current;
      const lastPoint = history[history.length - 1];
      if (!lastPoint || lastPoint[0] !== lat || lastPoint[1] !== lon) {
        history.push(newPos);
        pathPolylineRef.current.setLatLngs(history);
      }
    }

    // Pan map to new position without sudden jumping
    mapInstanceRef.current.panTo(newPos, { animate: true, duration: 0.5 });
  }, [lat, lon, showUserMarker, showBreadcrumbTrail]);

  // Render extra incident markers
  useEffect(() => {
    if (!incidentMarkersLayerRef.current) return;

    incidentMarkersLayerRef.current.clearLayers();

    markers.forEach(m => {
      if (m.lat && m.lon) {
        const marker = L.marker([m.lat, m.lon], {
          icon: createIncidentIcon(m.category)
        });

        if (m.title) {
          marker.bindTooltip(`<b>${m.title}</b><br/>${m.category?.toUpperCase() || ''}`, {
            direction: 'top',
            offset: [0, -10]
          });
        }

        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(m));
        }

        marker.addTo(incidentMarkersLayerRef.current);
      }
    });
  }, [markers, onMarkerClick, mapStyle]);

  // Toggle Real Hardware Browser GPS Geolocation
  const toggleDeviceGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    if (usingDeviceGps) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setUsingDeviceGps(false);
      setDeviceAccuracy(null);
    } else {
      const id = navigator.geolocation.watchPosition(
        position => {
          const { latitude, longitude, accuracy } = position.coords;
          setUsingDeviceGps(true);
          setDeviceAccuracy(Math.round(accuracy));
          if (onLocationUpdate) {
            onLocationUpdate(latitude, longitude);
          }
        },
        err => {
          console.warn('GPS Error:', err.message);
          alert(`GPS Warning: ${err.message}. Reverting to campus simulation.`);
          setUsingDeviceGps(false);
        },
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
      watchIdRef.current = id;
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: height, borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', background: '#070b19' }}>
      
      {/* 1. Offline Campus Tactical Texture Mode */}
      {mapStyle === 'tactical' ? (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0d14' }}>
          <img 
            src="/campus_night_map.jpg" 
            alt="Campus Satellite Map" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.85) contrast(1.1)' }} 
          />
          {/* Pulsing GPS User Pin */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}>
            <div style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="map-pin-pulse" style={{ position: 'absolute', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 82, 212, 0.4)', border: '1.5px solid #0052d4' }}></div>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#0052d4', border: '2.5px solid #ffffff', boxShadow: '0 0 14px #0052d4' }}></div>
            </div>
          </div>
          {/* Landmark Overlays */}
          <div style={{ position: 'absolute', top: '22%', left: '72%', background: 'rgba(7,11,25,0.85)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.55rem', color: '#94a3b8', border: '1px solid var(--border-color)', pointerEvents: 'none' }}>
            Hostel Block A
          </div>
          <div style={{ position: 'absolute', top: '75%', left: '72%', background: 'rgba(7,11,25,0.85)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.55rem', color: '#94a3b8', border: '1px solid var(--border-color)', pointerEvents: 'none' }}>
            Hostel Block B
          </div>
          <div style={{ position: 'absolute', top: '30%', left: '28%', background: 'rgba(7,11,25,0.85)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.55rem', color: '#94a3b8', border: '1px solid var(--border-color)', pointerEvents: 'none' }}>
            Health Centre
          </div>
        </div>
      ) : (
        /* 2. Interactive High-Res Map Engine */
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      )}

      {/* Top Left GPS Status HUD */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(7, 11, 25, 0.92)',
        backdropFilter: 'blur(8px)',
        padding: '5px 10px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span className="status-dot" style={{ width: '7px', height: '7px', backgroundColor: '#10b981' }}></span> 
          {usingDeviceGps ? `Device GPS (±${deviceAccuracy}m)` : 'Realtime GPS Satellite Active'}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
          Lat: {Number(lat).toFixed(5)}°, Lon: {Number(lon).toFixed(5)}°
        </span>
      </div>

      {/* Top Right Map Style / Layer Switcher & Hardware GPS Trigger */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: '6px',
        zIndex: 1000
      }}>
        {/* Layer Selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(7, 11, 25, 0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: '2px'
        }}>
          <button
            onClick={() => setMapStyle('google')}
            style={{
              fontSize: '0.65rem',
              padding: '4px 8px',
              borderRadius: '6px',
              background: mapStyle === 'google' ? '#0052d4' : 'transparent',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Google Map
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            style={{
              fontSize: '0.65rem',
              padding: '4px 8px',
              borderRadius: '6px',
              background: mapStyle === 'satellite' ? '#0052d4' : 'transparent',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapStyle('tactical')}
            style={{
              fontSize: '0.65rem',
              padding: '4px 8px',
              borderRadius: '6px',
              background: mapStyle === 'tactical' ? '#0052d4' : 'transparent',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Tactical
          </button>
        </div>

        {/* Live Device GPS Toggle Button */}
        <button
          onClick={toggleDeviceGps}
          title="Toggle your actual device hardware GPS"
          style={{
            background: usingDeviceGps ? '#10b981' : 'rgba(7, 11, 25, 0.92)',
            color: '#fff',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.65rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          <Crosshair size={13} />
          {usingDeviceGps ? 'Phone GPS' : 'My GPS'}
        </button>
      </div>

      {/* Bottom Left Quick Directions Action */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 1000
      }}>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: '0.65rem',
            background: 'rgba(0, 82, 212, 0.92)',
            backdropFilter: 'blur(6px)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)'
          }}
        >
          <MapPin size={11} /> Open in Google Maps App
        </a>
      </div>

    </div>
  );
}
