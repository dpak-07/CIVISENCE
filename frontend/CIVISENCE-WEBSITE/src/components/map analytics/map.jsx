import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

/* ================= LEAFLET FIX ================= */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ================= ANIMATED ICONS ================= */
const officeIcon = new L.DivIcon({
  className: "",
  html: `
    <div class="office-marker">
      <div class="office-core"></div>
      <div class="office-ring"></div>
      <div class="office-pulse"></div>
    </div>
  `,
  iconSize: [40, 40],
});

const createIssueIcon = (severity) => {
  return new L.DivIcon({
    className: "",
    html: `
      <div class="issue-marker severity-${severity.toLowerCase()}">
        <div class="issue-core"></div>
        <div class="issue-glow"></div>
        <svg class="issue-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
  });
};

/* ================= TEST DATA ================= */
const center = [13.1706, 80.097];

const municipalOffices = [
  { id: 1, name: "Ambattur Zone Office", position: [13.1725, 80.0952], active: true },
  { id: 2, name: "Ward Office – Velammal", position: [13.1689, 80.1004], active: true },
];

const issues = [
  { id: 1, type: "Pothole", severity: "Critical", position: [13.1718, 80.0986], time: "2h ago", status: "pending" },
  { id: 2, type: "Garbage Overflow", severity: "Moderate", position: [13.1694, 80.0947], time: "5h ago", status: "assigned" },
  { id: 3, type: "Streetlight Failure", severity: "Low", position: [13.1732, 80.1015], time: "1d ago", status: "resolved" },
  { id: 4, type: "Water Leak", severity: "Critical", position: [13.1701, 80.0968], time: "30m ago", status: "pending" },
];

const wardBoundary = [
  [13.174, 80.093],
  [13.176, 80.101],
  [13.168, 80.104],
  [13.166, 80.096],
];

/* ================= PARTICLE SYSTEM ================= */
function ParticleOverlay() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: Math.random(),
      });
    }

    let animationId;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.fillStyle = "rgba(2, 6, 23, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.002;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${Math.sin(p.life) * 0.3 + 0.3})`;
        ctx.fill();

        // Connect nearby particles
        particles.forEach((p2, j) => {
          if (i === j) return;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[500]" />;
}

/* ================= MAP HELPERS ================= */
function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 17, { duration: 1.2 });
  }, [position, map]);
  return null;
}

function HeatLayer({ points, show }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!show) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }
    
    if (L.heatLayer) {
      layerRef.current = L.heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        gradient: {
          0.0: '#3b82f6',
          0.5: '#f59e0b',
          1.0: '#ef4444'
        }
      }).addTo(map);
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [show, points, map]);

  return null;
}

function ConnectionLines({ issues, offices }) {
  const lines = useMemo(() => {
    return issues
      .filter((i) => i.status === "assigned")
      .map((i) => {
        const nearest = offices[0];
        return {
          from: i.position,
          to: nearest.position,
          severity: i.severity
        };
      });
  }, [issues, offices]);

  return (
    <>
      {lines.map((line, i) => (
        <Polyline
          key={i}
          positions={[line.from, line.to]}
          pathOptions={{
            color: line.severity === "Critical" ? "#ef4444" : "#f59e0b",
            weight: 2,
            opacity: 0.6,
            dashArray: "10, 10",
            className: "animated-line"
          }}
        />
      ))}
    </>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function MapDashboard() {
  const [pulse, setPulse] = useState(600);
  const [search, setSearch] = useState("");
  const [focus, setFocus] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setPulse((p) => (p === 600 ? 900 : 600)), 1200);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const filteredIssues = useMemo(() => {
    return filterSeverity
      ? issues.filter((i) => i.severity === filterSeverity)
      : issues;
  }, [filterSeverity]);

  const suggestions = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return [
      ...municipalOffices
        .filter((o) => o.name.toLowerCase().includes(q))
        .map((o) => ({ label: o.name, pos: o.position, type: 'office' })),
      ...issues
        .filter((i) => i.type.toLowerCase().includes(q))
        .map((i) => ({ label: i.type, pos: i.position, type: 'issue' })),
    ];
  }, [search]);

  const heatPoints = filteredIssues.map((i) => [...i.position, i.severity === "Critical" ? 1 : 0.5]);

  const stats = useMemo(() => ({
    total: issues.length,
    critical: issues.filter(i => i.severity === "Critical").length,
    pending: issues.filter(i => i.status === "pending").length,
    resolved: issues.filter(i => i.status === "resolved").length,
  }), []);

  return (
    <div className="relative h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] overflow-hidden">

      {/* ================= STYLES ================= */}
      <style>{`
        /* Office Markers */
        .office-marker {
          position: relative;
          width: 40px;
          height: 40px;
        }
        .office-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: linear-gradient(135deg, #22c55e, #10b981);
          border-radius: 50%;
          box-shadow: 0 0 20px #22c55e, inset 0 2px 4px rgba(255,255,255,0.3);
          animation: coreGlow 2s ease-in-out infinite;
        }
        .office-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          border: 2px solid #22c55e;
          border-radius: 50%;
          animation: ringRotate 4s linear infinite;
        }
        .office-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: #22c55e;
          border-radius: 50%;
          animation: officePulse 2s ease-out infinite;
        }

        /* Issue Markers */
        .issue-marker {
          position: relative;
          width: 32px;
          height: 32px;
        }
        .issue-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          border-radius: 50%;
          animation: issueFloat 3s ease-in-out infinite;
        }
        .severity-critical .issue-core {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 0 25px #ef4444, inset 0 2px 4px rgba(255,255,255,0.3);
        }
        .severity-moderate .issue-core {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          box-shadow: 0 0 20px #f59e0b, inset 0 2px 4px rgba(255,255,255,0.3);
        }
        .severity-low .issue-core {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          box-shadow: 0 0 15px #3b82f6, inset 0 2px 4px rgba(255,255,255,0.3);
        }
        .issue-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          border-radius: 50%;
          animation: issueGlow 1.5s ease-out infinite;
        }
        .severity-critical .issue-glow {
          background: #ef4444;
        }
        .severity-moderate .issue-glow {
          background: #f59e0b;
        }
        .severity-low .issue-glow {
          background: #3b82f6;
        }
        .issue-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          color: white;
          z-index: 10;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
        }

        /* Animations */
        @keyframes coreGlow {
          0%, 100% { box-shadow: 0 0 20px #22c55e, inset 0 2px 4px rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 30px #22c55e, 0 0 40px #22c55e, inset 0 2px 4px rgba(255,255,255,0.3); }
        }
        @keyframes ringRotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes officePulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        @keyframes issueFloat {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-4px); }
        }
        @keyframes issueGlow {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }

        /* Animated Line */
        .animated-line {
          stroke-dasharray: 10 10;
          animation: dashMove 2s linear infinite;
        }
        @keyframes dashMove {
          to { stroke-dashoffset: -20; }
        }

        /* Glassmorphism */
        .glass {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Scan Line */
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .scan-line {
          animation: scan 4s ease-in-out infinite;
        }

        /* Custom Scrollbar */
        .glass::-webkit-scrollbar {
          width: 6px;
        }
        .glass::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .glass::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.5);
          border-radius: 3px;
        }
        .glass::-webkit-scrollbar-thumb:hover {
          background: rgba(56, 189, 248, 0.7);
        }
      `}</style>

      {/* ================= PARTICLE BACKGROUND ================= */}
      <ParticleOverlay />

      {/* ================= TOP BAR ================= */}
      <div className="absolute top-0 left-0 right-0 z-[1000] glass border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50">
                <span className="text-white font-bold text-xl">CS</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#020617] animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                CiviSense Command Center
              </h1>
              <p className="text-xs text-gray-400">{time.toLocaleTimeString()} • Real-time Monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= LEFT PANEL ================= */}
      <div className="absolute top-24 left-6 z-[1000] w-80 space-y-4">
        
        {/* Stats Cards */}
        <div className="glass rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500"></div>
          <div className="relative z-10">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
              Live Statistics
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group relative">
                <div className="text-3xl font-bold bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  {stats.total}
                </div>
                <div className="text-xs text-gray-400 mt-1">Total Issues</div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                </div>
              </div>

              <div className="glass rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group relative">
                <div className="text-3xl font-bold bg-gradient-to-br from-red-400 to-red-600 bg-clip-text text-transparent">
                  {stats.critical}
                </div>
                <div className="text-xs text-gray-400 mt-1">Critical</div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="glass rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group">
                <div className="text-3xl font-bold bg-gradient-to-br from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {stats.pending}
                </div>
                <div className="text-xs text-gray-400 mt-1">Pending</div>
              </div>

              <div className="glass rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group">
                <div className="text-3xl font-bold bg-gradient-to-br from-green-400 to-green-600 bg-clip-text text-transparent">
                  {stats.resolved}
                </div>
                <div className="text-xs text-gray-400 mt-1">Resolved</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="glass rounded-2xl p-5 text-white">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues or offices..."
              className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl outline-none focus:border-cyan-400 transition-all placeholder-gray-500"
            />
            <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-3 space-y-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setFocus(s.pos);
                    setSearch("");
                  }}
                  className="block w-full px-4 py-3 text-left hover:bg-white/10 rounded-lg transition-all flex items-center gap-3 group"
                >
                  <div className={`w-2 h-2 rounded-full ${s.type === 'office' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="flex-1">{s.label}</span>
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-5 text-white">
          <h3 className="font-semibold mb-3 text-sm text-gray-300">FILTER BY SEVERITY</h3>
          <div className="flex gap-2">
            {["Critical", "Moderate", "Low"].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(filterSeverity === sev ? null : sev)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterSeverity === sev
                    ? sev === "Critical"
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/50"
                      : sev === "Moderate"
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                      : "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={() => setShowHeatmap(!showHeatmap)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-white/10 rounded-full peer-checked:bg-cyan-500 transition-all"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4 shadow-lg"></div>
              </div>
              <span className="group-hover:text-cyan-400 transition-colors">Heatmap</span>
            </label>
          </div>
        </div>

        {/* Issue List */}
        <div className="glass rounded-2xl p-5 text-white max-h-64 overflow-y-auto">
          <h3 className="font-semibold mb-3 text-sm text-gray-300">RECENT ISSUES</h3>
          <div className="space-y-2">
            {filteredIssues.slice(0, 5).map((issue) => (
              <button
                key={issue.id}
                onClick={() => {
                  setFocus(issue.position);
                  setSelectedIssue(issue);
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{issue.type}</div>
                    <div className="text-xs text-gray-400 mt-1">{issue.time}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    issue.severity === "Critical"
                      ? "bg-red-500/20 text-red-400"
                      : issue.severity === "Moderate"
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {issue.severity}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL (Selected Issue) ================= */}
      {selectedIssue && (
        <div className="absolute top-24 right-6 z-[1000] w-80 glass rounded-2xl p-5 text-white shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-semibold text-lg">Issue Details</h3>
            <button
              onClick={() => setSelectedIssue(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Type</div>
              <div className="font-medium">{selectedIssue.type}</div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">Severity</div>
              <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                selectedIssue.severity === "Critical"
                  ? "bg-red-500/20 text-red-400"
                  : selectedIssue.severity === "Moderate"
                  ? "bg-orange-500/20 text-orange-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}>
                {selectedIssue.severity}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <div className="capitalize">{selectedIssue.status}</div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">Reported</div>
              <div>{selectedIssue.time}</div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <button className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/50 transition-all">
                Assign to Officer
              </button>
              <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-all">
                View History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SCAN LINE OVERLAY ================= */}
      <div className="absolute inset-0 z-[999] pointer-events-none overflow-hidden">
        <div className="scan-line absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30"></div>
      </div>

      {/* ================= MAP ================= */}
      <MapContainer center={center} zoom={15} className="h-full w-full" zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        <FlyTo position={focus} />
        <HeatLayer points={heatPoints} show={showHeatmap} />
        <ConnectionLines issues={filteredIssues} offices={municipalOffices} />

        {/* Ward Boundary */}
        <Polygon
          positions={wardBoundary}
          pathOptions={{
            color: "#38bdf8",
            weight: 3,
            fillOpacity: 0.05,
            dashArray: "5, 10",
          }}
        />

        {/* Offices */}
        {municipalOffices.map((o) => (
          <Marker key={o.id} position={o.position} icon={officeIcon}>
            <Popup className="custom-popup">
              <div className="p-2">
                <div className="font-semibold text-green-600">{o.name}</div>
                <div className="text-xs text-gray-500 mt-1">Status: Active</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Issues */}
        {filteredIssues.map((i) => (
          <div key={i.id}>
            <Circle
              center={i.position}
              radius={pulse}
              pathOptions={{
                color: i.severity === "Critical" ? "#ef4444" : i.severity === "Moderate" ? "#f59e0b" : "#3b82f6",
                fillOpacity: 0.08,
                weight: 1,
              }}
            />
            <Marker
              position={i.position}
              icon={createIssueIcon(i.severity)}
              eventHandlers={{
                click: () => {
                  setSelectedIssue(i);
                  setFocus(i.position);
                },
              }}
            >
              <Popup>
                <div className="p-2">
                  <div className="font-semibold">{i.type}</div>
                  <div className="text-xs text-gray-500 mt-1">Severity: {i.severity}</div>
                  <div className="text-xs text-gray-500">Status: {i.status}</div>
                  <div className="text-xs text-gray-400 mt-2">{i.time}</div>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
}