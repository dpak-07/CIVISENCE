import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

function ClickCapture({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    },
  });
  return null;
}

function LocationPickerMap({ value, onChange }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/15">
      <MapContainer center={[12.9716, 77.5946]} zoom={12} scrollWheelZoom className="h-60 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickCapture onPick={onChange} />

        {value ? (
          <CircleMarker
            center={[value.lat, value.lng]}
            radius={9}
            pathOptions={{ color: "#22d3ee", fillColor: "#22d3ee", fillOpacity: 0.55, weight: 2 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

export default LocationPickerMap;
