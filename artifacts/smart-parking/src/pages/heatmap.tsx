import { useGetHeatmap } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Grid3X3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Heatmap() {
  const [timeOfDay, setTimeOfDay] = useState("12:00");
  const { data: heatmapData, isLoading } = useGetHeatmap({ timeOfDay });

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive/80 border-destructive shadow-[0_0_15px_rgba(255,0,0,0.3)]';
      case 'medium': return 'bg-yellow-500/80 border-yellow-600 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
      case 'low': return 'bg-secondary/80 border-secondary shadow-[0_0_15px_rgba(0,255,100,0.3)]';
      default: return 'bg-muted border-muted-foreground/30';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Grid3X3 className="h-8 w-8 text-primary" />
            Demand Heatmap
          </h1>
          <p className="text-muted-foreground mt-1">Spatial distribution of parking demand across the city grid.</p>
        </div>
        <div className="w-48">
          <Select value={timeOfDay} onValueChange={setTimeOfDay}>
            <SelectTrigger>
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

      <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative shadow-2xl">
        {/* Abstract stylized grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-full h-full opacity-20" />
          </div>
        ) : (
          <div className="absolute inset-0 p-8 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 place-content-center">
            {heatmapData?.map((point, i) => (
              <div 
                key={i} 
                className={`relative group aspect-square rounded-md border ${getDemandColor(point.demandLevel)} transition-transform hover:scale-105 duration-200 cursor-crosshair`}
                style={{
                  opacity: Math.max(0.4, point.occupancyRate / 100)
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white/90 font-mono font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-sm">
                  {point.occupancyRate}%
                </div>
                {/* Tooltip on hover */}
                <div className="hidden group-hover:block absolute z-50 -top-12 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap shadow-lg">
                  {point.zoneName || `Zone ${point.zoneId}`}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur border p-3 rounded-lg flex items-center gap-4 text-sm font-mono">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-secondary shadow-[0_0_8px_var(--color-secondary)]"></div> Low Demand</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,1)]"></div> Medium</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_8px_var(--color-destructive)]"></div> High Demand</div>
        </div>
      </div>
    </div>
  );
}
