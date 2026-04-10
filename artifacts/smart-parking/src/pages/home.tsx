import { useState, useRef, useCallback, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useListZones, useListReports } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Navigation, Zap, X, AlertCircle, Flag, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Zone {
  id: number;
  name: string;
  lat: number;
  lng: number;
  availableSpots: number;
  totalSpots: number;
  demandLevel: string;
  confidenceScore: number;
  zoneType: string;
  pricePerHour?: number | null;
}

function createDemandIcon(demandLevel: string, available: number, total: number, hasReport = false) {
  const color = demandLevel === "high" ? "#ef4444" : demandLevel === "medium" ? "#f59e0b" : "#22c55e";
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const flagBadge = hasReport
    ? `<div style="position:absolute;top:-6px;right:-6px;background:#f97316;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;border:2px solid white;font-size:8px;">🚩</div>`
    : "";
  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      ${flagBadge}
      <div style="
        background:${color};color:white;border-radius:50%;
        width:40px;height:40px;display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:700;border:3px solid white;
        box-shadow:0 2px 10px rgba(0,0,0,0.35);font-family:monospace;cursor:pointer;
        ${hasReport ? "box-shadow:0 2px 10px rgba(0,0,0,0.35),0 0 0 3px #f97316;" : ""}
      ">${pct}%</div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${color};margin-top:-1px;"></div>
    </div>
  `;
  return L.divIcon({ html, className: "", iconSize: [40, 54], iconAnchor: [20, 54], popupAnchor: [0, -58] });
}

async function geocodeCity(query: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + " Bangalore India")}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}

const DEMAND_COLORS = {
  high: { bg: "bg-red-500/10", text: "text-red-600", badge: "destructive" as const },
  medium: { bg: "bg-amber-500/10", text: "text-amber-600", badge: "outline" as const },
  low: { bg: "bg-green-500/10", text: "text-green-600", badge: "secondary" as const },
};

export default function Home() {
  const { data: zones, isLoading } = useListZones();
  const { data: reports } = useListReports({ limit: 50 });
  const [, navigate] = useLocation();

  const mapRef = useRef<L.Map | null>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const [cardPos, setCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  const reportedZoneIds = new Set((reports ?? []).map((r) => r.zoneId).filter(Boolean));

  const allZones = (zones ?? []) as Zone[];
  const highlightedIds = new Set(
    searchQuery.trim()
      ? allZones.filter((z) => z.name.toLowerCase().includes(searchQuery.toLowerCase())).map((z) => z.id)
      : []
  );

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { center: [12.9716, 77.5946], zoom: 13, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation || locationStatus !== "idle") return;
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationStatus("granted");
        if (mapRef.current) {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          mapRef.current.flyTo(coords, 14, { animate: true, duration: 1.2 });
          const icon = L.divIcon({
            html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.25),0 2px 8px rgba(0,0,0,0.3);"></div>`,
            className: "", iconSize: [18, 18], iconAnchor: [9, 9],
          });
          L.marker(coords, { icon }).addTo(mapRef.current).bindTooltip("You are here");
        }
      },
      () => setLocationStatus("denied"),
      { timeout: 8000 }
    );
  }, [locationStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zones || isLoading) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    (zones as Zone[]).forEach((zone) => {
      const hasReport = reportedZoneIds.has(zone.id);
      const icon = createDemandIcon(zone.demandLevel, zone.availableSpots, zone.totalSpots, hasReport);
      const marker = L.marker([zone.lat, zone.lng], { icon }).addTo(map);

      marker.on("mouseover", (e) => {
        clearTimeout(hoverTimeout.current);
        const rect = mapContainerRef.current?.getBoundingClientRect();
        if (rect && e.originalEvent) {
          const ev = e.originalEvent as MouseEvent;
          setCardPos({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
        }
        setHoveredZone(zone);
      });
      marker.on("mouseout", () => { hoverTimeout.current = setTimeout(() => setHoveredZone(null), 250); });
      marker.on("click", () => navigate(`/zones/${zone.id}`));
      markersRef.current.set(zone.id, marker);
    });
  }, [zones, isLoading, reports]);

  const flyToZone = useCallback((zone: Zone) => {
    setSelectedZoneId(zone.id);
    mapRef.current?.flyTo([zone.lat, zone.lng], 16, { animate: true, duration: 0.9 });
  }, []);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    const nameMatch = (zones as Zone[] ?? []).find((z) =>
      z.name.toLowerCase().includes(q.toLowerCase())
    );
    if (nameMatch) {
      flyToZone(nameMatch);
      return;
    }
    setIsSearching(true);
    const coords = await geocodeCity(q);
    setIsSearching(false);
    if (coords && mapRef.current) {
      mapRef.current.flyTo(coords, 14, { animate: true, duration: 1.2 });
    }
  }, [searchQuery, zones, flyToZone]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedZoneId(null);
  };

  const demandInfo = (level: string) => DEMAND_COLORS[level as keyof typeof DEMAND_COLORS] ?? DEMAND_COLORS.low;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <div className="px-4 md:px-6 py-3 flex items-center gap-3 border-b bg-background z-10 shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight leading-none">Live Map</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Parking intelligence — AI + crowdsourced reports</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {locationStatus === "requesting" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <Navigation className="h-3.5 w-3.5" />Locating…
            </span>
          )}
          {locationStatus === "granted" && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <Navigation className="h-3.5 w-3.5" />Location active
            </span>
          )}
          {locationStatus === "denied" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />Location off
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 flex-shrink-0 flex flex-col border-r bg-background overflow-hidden">
          <div className="p-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search zones or area…"
                className="w-full pl-8 pr-8 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
              {searchQuery ? (
                <button onClick={handleClearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {searchQuery && (
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="mt-2 w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSearching
                  ? <span className="h-3 w-3 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  : <Search className="h-3 w-3" />}
                Search area on map
              </button>
            )}
          </div>

          <div className="px-3 py-2 border-b shrink-0 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {allZones.length} zone{allZones.length !== 1 ? "s" : ""}
              {highlightedIds.size > 0 && ` · ${highlightedIds.size} matched`}
            </span>
            {reportedZoneIds.size > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                <Flag className="h-3 w-3" />
                {reportedZoneIds.size} reported
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {[
                  ...allZones.filter((z) => highlightedIds.has(z.id)),
                  ...allZones.filter((z) => !highlightedIds.has(z.id)),
                ].map((zone) => {
                  const info = demandInfo(zone.demandLevel);
                  const hasReport = reportedZoneIds.has(zone.id);
                  const isSelected = selectedZoneId === zone.id;
                  const isMatch = highlightedIds.has(zone.id);
                  return (
                    <button
                      key={zone.id}
                      onClick={() => flyToZone(zone)}
                      className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors group
                        ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""}
                        ${isMatch && !isSelected ? "bg-amber-50 dark:bg-amber-950/20 border-l-2 border-l-amber-400" : ""}
                      `}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${info.bg} ${info.text}`}>
                        {zone.totalSpots > 0 ? Math.round((zone.availableSpots / zone.totalSpots) * 100) : 0}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold leading-tight truncate">{zone.name}</span>
                          {hasReport && <Flag className="h-3 w-3 text-orange-500 shrink-0" />}
                          {isMatch && <span className="text-[9px] bg-amber-400/20 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wide">match</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground capitalize">{zone.zoneType}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs font-medium">{zone.availableSpots}/{zone.totalSpots} free</span>
                        </div>
                        {hasReport && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-500 font-medium mt-0.5">
                            <Flag className="h-2.5 w-2.5" />Crowd report active
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-2.5 border-t shrink-0 flex items-center gap-4 text-xs text-muted-foreground bg-muted/30">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span>Low</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Med</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span>High</span>
            <span className="flex items-center gap-1.5 ml-auto"><Flag className="h-2.5 w-2.5 text-orange-500" />Reported</span>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden" ref={mapContainerRef}>
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground font-medium">Loading parking data…</span>
              </div>
            </div>
          )}

          <div ref={mapElRef} className="w-full h-full" />

          {hoveredZone && (
            <div
              className="absolute z-[9999] pointer-events-none"
              style={{ left: cardPos.x, top: cardPos.y - 16, transform: "translate(-50%,-100%)", minWidth: 240 }}
              onMouseEnter={() => clearTimeout(hoverTimeout.current)}
              onMouseLeave={() => { hoverTimeout.current = setTimeout(() => setHoveredZone(null), 250); }}
            >
              <Link href={`/zones/${hoveredZone.id}`} className="pointer-events-auto block">
                <div className="bg-background border rounded-xl shadow-2xl p-4 space-y-3 cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm leading-tight">{hoveredZone.name}</p>
                        {reportedZoneIds.has(hoveredZone.id) && (
                          <span title="Crowd report active" className="flex items-center gap-0.5 text-xs text-orange-500 font-medium">
                            <Flag className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{hoveredZone.zoneType} parking</p>
                    </div>
                    <Badge variant={demandInfo(hoveredZone.demandLevel).badge} className="font-mono text-xs uppercase shrink-0">
                      {hoveredZone.demandLevel}
                    </Badge>
                  </div>

                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl font-bold font-mono leading-none">{hoveredZone.availableSpots}</span>
                    <span className="text-sm text-muted-foreground mb-1">/ {hoveredZone.totalSpots} free</span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${hoveredZone.totalSpots > 0 ? (hoveredZone.availableSpots / hoveredZone.totalSpots) * 100 : 0}%`,
                      background: hoveredZone.demandLevel === "high" ? "#ef4444" : hoveredZone.demandLevel === "medium" ? "#f59e0b" : "#22c55e",
                    }} />
                  </div>

                  {reportedZoneIds.has(hoveredZone.id) && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-500 font-medium bg-orange-50 dark:bg-orange-950/30 rounded-lg px-2.5 py-1.5">
                      <Flag className="h-3 w-3" />
                      Crowdsourced report active for this zone
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <div className="flex items-center gap-1 text-primary font-semibold">
                      <Zap className="h-3 w-3 fill-current" />
                      {hoveredZone.confidenceScore}% AI confidence
                    </div>
                    {hoveredZone.pricePerHour != null && hoveredZone.pricePerHour > 0 && (
                      <span className="text-muted-foreground">₹{hoveredZone.pricePerHour}/hr</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-primary font-medium pt-1.5 border-t">
                    <MapPin className="h-3 w-3" />
                    Click to view details &amp; predictions
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
