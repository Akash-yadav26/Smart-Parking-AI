import { useListPredictions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BrainCircuit } from "lucide-react";

export default function Predictions() {
  const { data: predictions, isLoading } = useListPredictions({});

  // Group by zone for chart display
  const chartData = predictions?.reduce((acc: any, curr) => {
    const timeSlot = curr.timeSlot;
    if (!acc[timeSlot]) {
      acc[timeSlot] = { time: timeSlot };
    }
    acc[timeSlot][curr.zoneName || curr.zoneId] = curr.availabilityProbability;
    return acc;
  }, {});

  const dataArray = chartData ? Object.values(chartData) : [];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-primary" />
          AI Prediction Engine
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Deep learning models forecasting parking availability based on historical data, 
          real-time crowdsourcing, and traffic patterns.
        </p>
      </div>

      <Card className="border-2 border-primary/20 shadow-md">
        <CardHeader>
          <CardTitle>Availability Forecast (Next 12 Hours)</CardTitle>
          <CardDescription>Probability of finding a spot across monitored zones.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataArray} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickMargin={10}
                    fontFamily="monospace"
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    fontFamily="monospace"
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}
                  />
                  {Object.keys(dataArray[0] || {}).filter(k => k !== 'time').map((key, i) => (
                    <Area 
                      key={key}
                      type="monotone" 
                      dataKey={key} 
                      stroke={`hsl(var(--chart-${(i % 5) + 1}))`} 
                      fillOpacity={1} 
                      fill="url(#colorProb)" 
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {predictions?.slice(0,6).map((pred, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="font-bold">{pred.zoneName || `Zone ${pred.zoneId}`}</p>
                <p className="text-sm text-muted-foreground font-mono">{pred.timeSlot}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono text-secondary">{pred.availabilityProbability}%</p>
                <p className="text-xs text-muted-foreground uppercase">{pred.confidence} confidence</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
