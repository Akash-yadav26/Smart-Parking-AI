import { useGetLeaderboard } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ShieldCheck, Target, TrendingUp } from "lucide-react";

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col items-center text-center space-y-4">
        <Trophy className="h-16 w-16 text-yellow-500 mb-2" />
        <h1 className="text-4xl font-bold tracking-tight">Top Contributors</h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          The heroes mapping the city. Rankings based on verified reports, accuracy rate, and consistency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            <h3 className="font-bold text-lg mt-2">Accuracy Matters</h3>
            <p className="text-sm text-muted-foreground">High accuracy reports earn 2x points and build trust score.</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <ShieldCheck className="h-8 w-8 text-secondary" />
            <h3 className="font-bold text-lg mt-2">Earn Trust</h3>
            <p className="text-sm text-muted-foreground">Trusted users' reports instantly update the live map.</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <TrendingUp className="h-8 w-8 text-yellow-600" />
            <h3 className="font-bold text-lg mt-2">Cash Rewards</h3>
            <p className="text-sm text-muted-foreground">Top 10 users monthly convert points to real parking credits.</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          (Array.isArray(leaderboard) ? leaderboard : []).map((user, i) => (
            <Card 
              key={user.userId} 
              className={`overflow-hidden transition-all hover:scale-[1.01] ${
                i === 0 ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/50' :
                i === 1 ? 'border-zinc-400 shadow-sm' :
                i === 2 ? 'border-amber-700 shadow-sm' : ''
              }`}
            >
              <CardContent className="p-0 flex items-center">
                <div className={`w-16 h-full flex-shrink-0 flex items-center justify-center text-2xl font-bold font-mono
                  ${i === 0 ? 'bg-yellow-500 text-white' : i === 1 ? 'bg-zinc-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'}
                `}>
                  #{user.rank}
                </div>
                <div className="flex-1 p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xl">{user.username}</h3>
                      <Badge variant={i < 3 ? 'default' : 'secondary'} className="capitalize">{user.badge}</Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground font-mono">
                      <span>{user.totalReports} reports</span>
                      <span>•</span>
                      <span>{user.accuracyRate}% accuracy</span>
                    </div>
                  </div>
                  <div className="text-right flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-mono tracking-tighter">{user.totalPoints}</span>
                    <span className="text-muted-foreground font-mono text-sm">pts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
