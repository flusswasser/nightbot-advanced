import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export default function ApiInfo() {
  const [copied, setCopied] = useState(false);
  const apiUrl = `${window.location.origin}/api/uninstall?program=$(query)`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card data-testid="card-api-info">
      <CardHeader>
        <CardTitle>Nightbot Setup Instructions</CardTitle>
        <CardDescription>
          Use this API endpoint in your Nightbot custom command
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Command Name:</p>
          <code className="block bg-muted p-3 rounded-md text-sm font-mono">
            !uninstall
          </code>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Command Response:</p>
          <div className="bg-muted p-3 rounded-md">
            <code className="text-sm font-mono break-all">
              $(urlfetch {apiUrl})
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="ml-2"
              onClick={copyToClipboard}
              data-testid="button-copy"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Usage in Twitch chat:</strong> !uninstall Windows Vista
          </p>
          <p>
            <strong>Response:</strong> chat has requested to uninstall Windows Vista 5 times, go ahead and do it already
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
