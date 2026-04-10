import { useState, useRef, useCallback, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useListZones } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Search, Navigation, Zap, X, AlertCircle } from "lucide-react";
import { Link } from "wouter";

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

function createDemandIcon(demandLevel: string, available: number, total: number) {
  const color = demandLevel === "high" ? "#ef4444" : demandLevel === "medium" ? "#f59e0b" : "#22c55e";
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="
        background:${color};color:white;border-radius:50%;
        width:40px;height:40px;display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:700;border:3px solid white;
        box-shadow:0 2px 10px rgba(0,0,0,0.35);font-family:monospace;cursor:pointer;
      ">${pct}%</div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${color};margin-top:-1px;"></div>
    </div>
  `;
  return L.divIcon({ html, className: "", iconSize: [40, 54], iconAnchor: [20, 54], popupAnchor: [0, -58] });
}

async function geocodeCity(query: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Home() {
  const { data: zones, isLoading } = useListZones();
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
  const [centerOfInterest, setCenterOfInterest] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, {
      center: [12.9716, 77.5946],
      zoom: 13,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation || locationStatus !== "idle") return;
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCenterOfInterest(coords);
        setLocationStatus("granted");
        if (mapRef.current) {
          mapRef.current.flyTo(coords, 14, { animate: true, duration: 1.2 });
          const userIcon = L.divIcon({
            html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.25),0 2px 8px rgba(0,0,0,0.3);"></div>`,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          L.marker(coords, { icon: userIcon }).addTo(mapRef.current).bindTooltip("You are here", { permanent: false });
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

    const visibleZones = zones.filter((z) => {
      if (!centerOfInterest) return true;
      return haversineKm(centerOfInterest[0], centerOfInterest[1], z.lat, z.lng) < 20;
    }) as Zone[];

    visibleZones.forEach((zone) => {
      const icon = createDemandIcon(zone.demandLevel, zone.availableSpots, zone.totalSpots);
      const marker = L.marker([zone.lat, zone.lng], { icon }).addTo(map);

      marker.on("mouseover", (e) => {
        clearTimeout(hoverTimeout.current);
        const containerRect = mapContainerRef.current?.getBoundingClientRect();
        if (containerRect && e.originalEvent) {
          const ev = e.originalEvent as MouseEvent;
          setCardPos({
            x: ev.clientX - containerRect.left,
            y: ev.clientY - containerRect.top,
          });
        }
        setHoveredZone(zone);
      });

      marker.on("mouseout", () => {
        hoverTimeout.current = setTimeout(() => setHoveredZone(null), 250);
      });

      marker.on("click", () => {
        window.location.href = `/zones/${zone.id}`;
      });

      markersRef.current.set(zone.id, marker);
    });
  }, [zones, isLoading, centerOfInterest]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const coords = await geocodeCity(searchQuery);
    setIsSearching(false);
    if (coords && mapRef.current) {
      setCenterOfInterest(coords);
      mapRef.current.flyTo(coords, 14, { animate: true, duration: 1.2 });
    }
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const visibleCount = (zones ?? []).filter((z) => {
    if (!centerOfInterest) return true;
    return haversineKm(centerOfInterest[0], centerOfInterest[1], z.lat, z.lng) < 20;
  }).length;

  const demandColor = (level: string) =>
    level === "high" ? "destructive" : level === "medium" ? "outline" : "secondary";

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <div className="px-4 md:px-8 py-4 flex flex-col gap-3 border-b bg-background z-10 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Map</h1>
            <p className="text-sm text-muted-foreground">Parking intelligence powered by AI and crowdsourcing</p>
          </div>
          {locationStatus === "requesting" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse shrink-0">
              <Navigation className="h-4 w-4" />
              Locating you...
            </div>
          )}
          {locationStatus === "granted" && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium shrink-0">
              <Navigation className="h-4 w-4" />
              Location active
            </div>
          )}
          {locationStatus === "denied" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <AlertCircle className="h-4 w-4" />
              Location off — search to navigate
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search city or area — e.g. Koramangala, Bangalore..."
              className="w-full pl-9 pr-9 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setCenterOfInterest(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            {isSearching ? (
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
        </div>

        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shrink-0"></span>Low
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0"></span>Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shrink-0"></span>High demand
          </span>
          <span className="ml-auto font-medium">
            {isLoading ? "Loading zones..." : `${visibleCount} zone${visibleCount !== 1 ? "s" : ""} in view`}
          </span>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden" ref={mapContainerRef}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground font-medium">Loading parking data...</span>
            </div>
          </div>
        )}
        <div ref={mapElRef} className="w-full h-full" />

        {hoveredZone && (
          <div
            className="absolute z-[9999] pointer-events-none"
            style={{
              left: cardPos.x,
              top: cardPos.y - 16,
              transform: "translate(-50%, -100%)",
              minWidth: 240,
            }}
            onMouseEnter={() => clearTimeout(hoverTimeout.current)}
            onMouseLeave={() => { hoverTimeout.current = setTimeout(() => setHoveredZone(null), 250); }}
          >
            <Link href={`/zones/${hoveredZone.id}`} className="pointer-events-auto block">
              <div className="bg-background border rounded-xl shadow-2xl p-4 space-y-3 cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm leading-tight">{hoveredZone.name}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{hoveredZone.zoneType} parking</p>
                  </div>
                  <Badge variant={demandColor(hoveredZone.demandLevel)} className="font-mono text-xs uppercase shrink-0">
                    {hoveredZone.demandLevel}
                  </Badge>
                </div>

                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-bold font-mono leading-none">{hoveredZone.availableSpots}</span>
                  <span className="text-sm text-muted-foreground mb-1">/ {hoveredZone.totalSpots} free</span>
                </div>

                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${hoveredZone.totalSpots > 0 ? (hoveredZone.availableSpots / hoveredZone.totalSpots) * 100 : 0}%`,
                      background: hoveredZone.demandLevel === "high" ? "#ef4444" : hoveredZone.demandLevel === "medium" ? "#f59e0b" : "#22c55e",
                    }}
                  />
                </div>

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
  );
}
