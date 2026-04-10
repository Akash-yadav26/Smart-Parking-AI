import { Link, useLocation } from "wouter";
import { 
  Map, 
  MapPin, 
  BarChart3, 
  Grid3X3, 
  Flag, 
  Trophy, 
  User,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/", label: "Live Map", icon: Map },
  { href: "/zones", label: "Zones", icon: MapPin },
  { href: "/predictions", label: "AI Engine", icon: BarChart3 },
  { href: "/heatmap", label: "Heatmap", icon: Grid3X3 },
  { href: "/report", label: "Report", icon: Flag },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const NavLinks = () => (
    <>
      <div className="mb-8 px-4">
        <h1 className="text-xl font-bold tracking-tight text-primary">
          Park<span className="text-secondary">Sense</span>
        </h1>
        <p className="text-xs text-muted-foreground font-mono mt-1">Smart City Intelligence</p>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  active 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card/50 backdrop-blur pt-6">
        <NavLinks />
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card/80 backdrop-blur z-50 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-primary">
            Park<span className="text-secondary">Sense</span>
          </h1>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 pt-10">
            <NavLinks />
          </SheetContent>
        </Sheet>
      </div>

      <main className={`flex-1 pt-16 md:pt-0 ${location === "/" || location === "/heatmap" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>
        {children}
      </main>
    </div>
  );
}
