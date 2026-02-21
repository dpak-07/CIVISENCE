import { motion as Motion } from "framer-motion";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";

const severityColor = {
  high: "#f43f5e",
  medium: "#fb923c",
  low: "#22d3ee",
};

function CityMap({ clusters, sensitiveLocations, height = "450px" }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
      className="overflow-hidden rounded-2xl border border-white/10"
      style={{ height }}
    >
      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {clusters.map((cluster) => (
          <CircleMarker
            key={cluster.id}
            center={[cluster.lat, cluster.lng]}
            radius={Math.max(8, Math.min(26, cluster.count / 3))}
            pathOptions={{
              color: severityColor[cluster.severity],
              fillColor: severityColor[cluster.severity],
              fillOpacity: 0.45,
              weight: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              {cluster.count} complaints ({cluster.severity})
            </Tooltip>
            <Popup>
              Cluster ID: {cluster.id}
              <br />
              Complaints: {cluster.count}
              <br />
              Severity: {cluster.severity}
            </Popup>
          </CircleMarker>
        ))}

        {sensitiveLocations.map((spot) => (
          <CircleMarker
            key={spot.id}
            center={[spot.lat, spot.lng]}
            radius={7}
            pathOptions={{
              color: "#fde047",
              fillColor: "#facc15",
              fillOpacity: 0.75,
              weight: 2,
              dashArray: "2 4",
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              Sensitive: {spot.name}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </Motion.div>
  );
}

export default CityMap;
