import { useGetZone, useListSpots, useGetBestArrivalTime, getGetZoneQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Zap, Info } from "lucide-react";

export default function ZoneDetail() {
  const params = useParams();
  const zoneId = parseInt(params.id || "0", 10);
  
  const { data: zone, isLoading: isZoneLoading } = useGetZone(zoneId, {
    query: { enabled: !!zoneId, queryKey: getGetZoneQueryKey(zoneId) }
  });
  
  const { data: spots, isLoading: isSpotsLoading } = useListSpots({ zoneId });
  const { data: bestTime } = useGetBestArrivalTime({ zoneId });

  if (isZoneLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!zone) return <div className="p-8 text-center text-muted-foreground">Zone not found</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold tracking-tight">{zone.name}</h1>
            <Badge variant="outline" className="capitalize text-sm">{zone.zoneType}</Badge>
          </div>
          <p className="text-muted-foreground text-lg">{zone.description || "No description provided."}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">AI Confidence</span>
            <span className="text-2xl font-mono font-bold text-secondary flex items-center gap-1">
              <Zap className="h-5 w-5 fill-current" /> {zone.confidenceScore}%
            </span>
          </div>
          {zone.pricePerHour && (
            <p className="font-mono font-medium">₹{zone.pricePerHour}/hr</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Spot Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {isSpotsLoading ? (
                Array.from({ length: 24 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))
              ) : (
                (Array.isArray(spots) ? spots : []).map(spot => (
                  <div 
                    key={spot.id}
                    className={`aspect-square rounded-md flex items-center justify-center font-mono text-xs font-bold border-2
                      ${spot.status === 'available' ? 'bg-secondary/20 border-secondary/50 text-secondary-foreground' : 
                        spot.status === 'occupied' ? 'bg-destructive/10 border-destructive/30 text-destructive/70 opacity-50' : 
                        'bg-muted border-muted-foreground/20 text-muted-foreground'}
                    `}
                    title={`Spot ${spot.spotNumber} - Confidence: ${spot.confidenceScore}%`}
                  >
                    {spot.spotNumber}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-secondary/20 border-2 border-secondary/50"></div> Available</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-destructive/10 border-2 border-destructive/30"></div> Occupied</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-muted border-2 border-muted-foreground/20"></div> Unknown</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground border-primary-border shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" /> Recommended Arrival
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bestTime ? (
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-4xl font-mono font-bold tracking-tighter">{bestTime.bestTime}</span>
                    <span className="text-primary-foreground/80 text-sm mt-1">{bestTime.probabilityAtBestTime}% predicted availability</span>
                  </div>
                  {bestTime.tip && (
                    <div className="bg-primary-foreground/10 p-3 rounded-md flex items-start gap-2 text-sm">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>{bestTime.tip}</p>
                    </div>
                  )}
                </div>
              ) : (
                <Skeleton className="h-24 w-full bg-primary-foreground/10" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Zone Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Total Spots</span>
                <span className="font-mono font-bold">{zone.totalSpots}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Available</span>
                <span className="font-mono font-bold text-secondary">{zone.availableSpots}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Demand</span>
                <Badge variant={zone.demandLevel === 'high' ? 'destructive' : 'secondary'} className="uppercase">
                  {zone.demandLevel}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
