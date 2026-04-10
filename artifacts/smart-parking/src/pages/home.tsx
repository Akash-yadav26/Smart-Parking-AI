import { useListZones } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: zones, isLoading } = useListZones();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Live Intelligence</h1>
        <p className="text-muted-foreground">Real-time parking demand across the city, powered by AI and crowdsourcing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : (
          zones?.map((zone) => (
            <Link key={zone.id} href={`/zones/${zone.id}`}>
              <Card className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all active-elevate-2 h-full flex flex-col">
                <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-base font-semibold line-clamp-1">{zone.name}</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-mono tracking-tighter font-bold">
                      {zone.availableSpots}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {zone.totalSpots} free</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <Badge 
                      variant={zone.demandLevel === 'high' ? 'destructive' : zone.demandLevel === 'medium' ? 'secondary' : 'default'}
                      className="font-mono text-xs uppercase"
                    >
                      {zone.demandLevel}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs font-mono font-medium text-secondary">
                      <Zap className="h-3 w-3 fill-current" />
                      {zone.confidenceScore}% AI
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
