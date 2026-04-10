import { useGetUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Shield, Zap, Wallet, Flag } from "lucide-react";

export default function Profile() {
  // Using ID 1 as mock logged-in user
  const { data: user, isLoading } = useGetUser(1, {
    query: { enabled: true, queryKey: ["/api/users/1"] }
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-64 w-full max-w-4xl mx-auto rounded-xl" /></div>;
  if (!user) return <div className="p-8 text-center text-muted-foreground">User profile not found</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-start gap-8">
        <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-xl shrink-0 relative">
          <User className="h-16 w-16 text-primary" />
          <div className="absolute -bottom-2 -right-2 bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-full border-2 border-background">
            Lvl {Math.floor(user.totalPoints / 500) + 1}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">{user.username}</h1>
            <Badge className="uppercase tracking-widest text-xs px-3 py-1">{user.rank}</Badge>
          </div>
          <p className="text-muted-foreground text-lg">Member since Oct 2024</p>
          
          <div className="flex items-center gap-2 mt-4 max-w-md">
            <Shield className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>Trust Score</span>
                <span className="font-mono">{user.trustScore}/100</span>
              </div>
              <Progress value={user.trustScore} className="h-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-primary-foreground/80 font-medium">Total Balance</span>
              <Wallet className="h-6 w-6 opacity-80" />
            </div>
            <div>
              <span className="text-5xl font-mono font-bold">₹{user.rewardsEarned}</span>
              <p className="text-sm text-primary-foreground/70 mt-1">Available to use for parking</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground font-medium">Points</span>
              <Zap className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <span className="text-5xl font-mono font-bold">{user.totalPoints}</span>
              <p className="text-sm text-muted-foreground mt-1 font-mono">10,000 pts = ₹100</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground font-medium">Reports</span>
              <Flag className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <span className="text-5xl font-mono font-bold">{user.totalReports}</span>
              <p className="text-sm text-muted-foreground mt-1 font-mono">{user.accuracyRate}% accuracy</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            Activity history feature coming soon.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
