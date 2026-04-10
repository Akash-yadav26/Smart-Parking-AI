import { useListZones } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Zones() {
  const { data: zones, isLoading } = useListZones();
  const [search, setSearch] = useState("");

  const filteredZones = (Array.isArray(zones) ? zones : []).filter(z => 
    z.name.toLowerCase().includes(search.toLowerCase()) || 
    z.zoneType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zones Directory</h1>
          <p className="text-muted-foreground">Browse and filter all monitored parking zones.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search zones..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : filteredZones?.length === 0 ? (
          <div className="text-center py-12 border rounded-xl border-dashed">
            <p className="text-muted-foreground">No zones found matching your criteria.</p>
          </div>
        ) : (
          filteredZones?.map((zone) => (
            <Link key={zone.id} href={`/zones/${zone.id}`}>
              <Card className="cursor-pointer hover:border-primary/40 transition-colors">
                <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{zone.name}</h3>
                      <Badge variant="outline" className="capitalize">{zone.zoneType}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{zone.description || "No description available."}</p>
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-1 w-full md:w-auto">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-mono font-bold">{zone.availableSpots}</span>
                      <span className="text-sm text-muted-foreground">spots</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={zone.demandLevel === 'high' ? 'destructive' : 'secondary'}>
                        {zone.demandLevel} demand
                      </Badge>
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
