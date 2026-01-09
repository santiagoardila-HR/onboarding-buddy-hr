import { Link } from "react-router-dom";
import { Bot } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">HappyRobot Onboarding Buddy</h1>
            <p className="text-xs text-muted-foreground">Schedule AI onboarding calls for new hires</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
