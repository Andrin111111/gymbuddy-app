# Geo & Privacy

## What we store
- Address fields you enter: `addressLine1`, `addressLine2` (optional), `postalCode`, `city`, `country`.
- Geocoded point (MongoDB `users.geo`) with rounded lat/lng (2 decimals) for privacy, plus `geoUpdatedAt`, `geoSource`, `geoPrecision`.
- The geocode is derived server-side using OpenCage and is rate-limited (5 requests/hour per user). If geocoding fails, the address text is saved but geo is cleared.

## What others can see
- Only city, postalCode (if present), and an approximate distance in km.
- No one receives your street address, address lines, or raw coordinates.
- Users without geo are shown with "unknown" distance; when a distance filter is applied, users without geo are excluded.

## How distance is computed
- Distance uses your stored `geo` point and the other user's `geo` via Haversine, rounded to integer km.
- Geo coordinates are rounded to 2 decimals when stored (`geoPrecision: "approx"`).
- Distance filtering is ignored when you have no geo; UI hints instruct users to add an address.

## Provider and secrets
- Geocoding uses OpenCage (`GEOCODING_API_KEY`). Set this as a Netlify environment variable. The key is never exposed to clients.

## Privacy defaults
- Visibility defaults to `friends`. Feed sharing is opt-in and remains unchanged by geo. Geo data is only used internally for distance/suggestions.
