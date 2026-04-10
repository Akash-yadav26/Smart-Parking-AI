import { useCreateReport, useListZones } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Flag, LogOut, LogIn, CheckCircle2, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { CreateParkingReportBodyReportType } from "@workspace/api-client-react/src/generated/api.schemas";

export default function Report() {
  const { data: zones } = useListZones();
  const createReport = useCreateReport();
  const { toast } = useToast();
  
  const [zoneId, setZoneId] = useState<string>("");
  const [reportType, setReportType] = useState<CreateParkingReportBodyReportType>("available");

  const handleSubmit = () => {
    if (!zoneId) {
      toast({ title: "Select a zone", variant: "destructive" });
      return;
    }

    createReport.mutate({
      data: {
        zoneId: parseInt(zoneId),
        reportType,
        userId: 1, // Mock user ID for now
      }
    }, {
      onSuccess: (data) => {
        toast({
          title: "Report verified!",
          description: `You earned +${data.pointsEarned} points. Thanks for contributing.`,
        });
        setZoneId("");
      },
      onError: () => {
        toast({ title: "Failed to submit report", variant: "destructive" });
      }
    });
  };

  const reportTypes = [
    { id: "leaving", icon: LogOut, label: "I am leaving a spot", desc: "Frees up a spot immediately", color: "text-blue-500" },
    { id: "arriving", icon: LogIn, label: "I just parked here", desc: "Marks a spot as occupied", color: "text-orange-500" },
    { id: "available", icon: CheckCircle2, label: "I see an empty spot", desc: "Spotted while driving by", color: "text-secondary" },
    { id: "occupied", icon: XCircle, label: "Lot looks full", desc: "Report high congestion", color: "text-destructive" },
  ] as const;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-10">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Flag className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Crowdsource Intelligence</h1>
        <p className="text-muted-foreground mt-2">Your reports help others find parking faster and earn you rewards.</p>
      </div>

      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle>Submit Report</CardTitle>
          <CardDescription>Select your location and what you observe right now.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Where are you?</label>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger className="h-12 text-lg">
                <SelectValue placeholder="Select a parking zone" />
              </SelectTrigger>
              <SelectContent>
                {zones?.map(zone => (
                  <SelectItem key={zone.id} value={zone.id.toString()}>{zone.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">What's happening?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportTypes.map((type) => {
                const isSelected = reportType === type.id;
                return (
                  <div
                    key={type.id}
                    onClick={() => setReportType(type.id as CreateParkingReportBodyReportType)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-muted hover:border-primary/30'
                    }`}
                  >
                    <type.icon className={`h-6 w-6 mb-3 ${type.color}`} />
                    <h3 className="font-semibold text-foreground">{type.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <Button 
            className="w-full h-14 text-lg mt-4 font-bold tracking-wide" 
            onClick={handleSubmit}
            disabled={createReport.isPending}
          >
            {createReport.isPending ? "Verifying..." : "Submit Report & Earn Points"}
          </Button>
          <p className="text-center text-xs text-muted-foreground font-mono">
            +10 pts per verified report. 95%+ accuracy required for Expert tier.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
