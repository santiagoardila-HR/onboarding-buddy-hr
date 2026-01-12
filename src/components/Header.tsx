import { Link, useLocation } from "react-router-dom";
import { Bot, Phone, BookOpen, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Onboarding Calls", icon: Phone },
    { to: "/faqs", label: "FAQ Manager", icon: BookOpen },
    { to: "/unanswered", label: "Unanswered", icon: HelpCircle },
  ];

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">HappyRobot Onboarding Buddy</h1>
              <p className="text-xs text-muted-foreground">Schedule AI onboarding calls for new hires</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.to
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
