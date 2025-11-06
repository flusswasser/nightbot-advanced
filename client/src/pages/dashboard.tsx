import UninstallTester from "@/components/UninstallTester";
import RequestsTable from "@/components/RequestsTable";
import ApiInfo from "@/components/ApiInfo";
import { Terminal } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-title">
              Nightbot Uninstall Tracker
            </h1>
          </div>
          <p className="text-muted-foreground">
            Track and display community uninstall requests for your Twitch chat
          </p>
        </div>

        <div className="grid gap-6">
          <ApiInfo />
          <UninstallTester />
          <RequestsTable />
        </div>
      </div>
    </div>
  );
}
