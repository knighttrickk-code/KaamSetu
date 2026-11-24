// Location helpers: haversine distance, privacy offset, neighbourhood list.
export const MATHURA = { lat: 27.4924, lng: 77.6737 };

export const AREAS = [
  { name: 'Krishna Nagar, Mathura', lat: 27.4990, lng: 77.6700 },
  { name: 'Dampier Nagar, Mathura', lat: 27.4865, lng: 77.6810 },
  { name: 'Civil Lines, Mathura', lat: 27.4885, lng: 77.6650 },
  { name: 'Govind Nagar, Mathura', lat: 27.5040, lng: 77.6780 },
  { name: 'Holi Gate, Mathura', lat: 27.4965, lng: 77.6795 },
  { name: 'Vrindavan', lat: 27.5806, lng: 77.7006 },
  { name: 'Agra', lat: 27.1767, lng: 78.0081 },
  { name: 'Noida', lat: 28.5700, lng: 77.3250 },
  { name: 'Gurugram', lat: 28.4595, lng: 77.0266 },
];

const toRad = (x) => (x * Math.PI) / 180;

/** Great-circle distance in km between {lat,lng} points. */
export function haversine(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return 9999;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rounded, human-friendly distance — exact coordinates are never shown. */
export function fmtKm(km) {
  if (km < 0.5) return '< 0.5 km';
  if (km < 10) return `${(Math.round(km * 2) / 2).toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Stable privacy offset of ~150–350 m so map pins never show a home address. */
export function offsetPoint(id, p) {
  const h = hash(String(id));
  const angle = (h % 360) * (Math.PI / 180);
  const meters = 150 + (h % 200);
  const dLat = (meters * Math.cos(angle)) / 111320;
  const dLng = (meters * Math.sin(angle)) / (111320 * Math.cos(toRad(p.lat)));
  return { lat: p.lat + dLat, lng: p.lng + dLng };
}

export function getGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no-gps'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}
