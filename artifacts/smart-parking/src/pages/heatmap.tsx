import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetHeatmap } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers } from "lucide-react";

const DEMAND_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  high:   { fill: "rgba(239,68,68,0.35)",  stroke: "#ef4444", glow: "rgba(239,68,68,0.6)" },
  medium: { fill: "rgba(245,158,11,0.35)", stroke: "#f59e0b", glow: "rgba(245,158,11,0.6)" },
  low:    { fill: "rgba(34,197,94,0.35)",  stroke: "#22c55e", glow: "rgba(34,197,94,0.6)"  },
};

function pulseHtml(color: { fill: string; stroke: string }, size: number) {
  return `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color.fill};
      border:2.5px solid ${color.stroke};
      box-shadow:0 0 ${size * 0.6}px ${color.glow ?? color.stroke};
      animation:heatPulse 2s ease-in-out infinite;
    "></div>
  `;
}

export default function Heatmap() {
  const [timeOfDay, setTimeOfDay] = useState("12:00");
  const { data: heatmapData, isLoading } = useGetHeatmap({ timeOfDay });
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      className: "map-tiles-dark",
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatmapData || isLoading) return;

    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    heatmapData.forEach((point) => {
      const colors = DEMAND_COLORS[point.demandLevel] ?? DEMAND_COLORS.low;
      const radius = 40 + (point.occupancyRate / 100) * 60;

      const icon = L.divIcon({
        html: pulseHtml(colors, Math.round(radius)),
        className: "",
        iconSize: [Math.round(radius), Math.round(radius)],
        iconAnchor: [Math.round(radius / 2), Math.round(radius / 2)],
      });

      const marker = L.marker([point.lat, point.lng], { icon, interactive: true }).addTo(map);

      marker.bindTooltip(
        `<div style="font-size:13px;font-weight:600">${point.zoneName ?? `Zone ${point.zoneId}`}</div>
         <div style="font-size:12px;color:#94a3b8;margin-top:2px">${point.demandLevel.toUpperCase()} demand &nbsp;·&nbsp; ${point.occupancyRate}% occupied</div>`,
        { direction: "top", offset: [0, -Math.round(radius / 2)], opacity: 1 }
      );

      layersRef.current.push(marker);
    });
  }, [heatmapData, isLoading]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <style>{`
        @keyframes heatPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.7; transform:scale(1.08); }
        }
      `}</style>

      <div className="px-4 md:px-8 py-4 flex items-center justify-between gap-4 border-b bg-background z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Demand Heatmap
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real city map showing parking demand intensity — hover a zone to see details
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Select value={timeOfDay} onValueChange={setTimeOfDay}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Time of Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="08:00">Morning (08:00)</SelectItem>
              <SelectItem value="12:00">Noon (12:00)</SelectItem>
              <SelectItem value="18:00">Evening (18:00)</SelectItem>
              <SelectItem value="22:00">Night (22:00)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-muted/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground font-medium">Loading heatmap…</span>
            </div>
          </div>
        )}

        <div ref={mapElRef} className="w-full h-full" />

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur border rounded-xl px-5 py-2.5 flex items-center gap-5 text-sm font-medium shadow-lg">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]"></span>Low
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]"></span>Medium
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]"></span>High demand
          </span>
          <span className="text-muted-foreground text-xs border-l pl-4">Larger = higher occupancy</span>
        </div>
      </div>
    </div>
  );
}
