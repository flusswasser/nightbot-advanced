import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Trash2, Copy, Check, Terminal, Skull, Trophy, ListOrdered } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UninstallRequest, Boss } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- API Info Component ---
function ApiInfo({ type }: { type: 'uninstall' | 'death' }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const getCommands = () => {
    if (type === 'uninstall') {
      const apiUrl = `${window.location.origin}/api/uninstall?program=$(query)`;
      return [
        { name: '!uninstall', url: apiUrl, description: "Track program uninstalls" }
      ];
    } else {
      return [
        { name: '!death', url: `${window.location.origin}/api/death?boss=$(query)`, description: "Add death to boss (provide name to change boss)" },
        { name: '!deaths', url: `${window.location.origin}/api/deaths?boss=$(query)`, description: "Show current boss deaths or specific boss stats" },
        { name: '!beaten', url: `${window.location.origin}/api/beaten?boss=$(query)`, description: "Mark boss as beaten" },
        { name: '!totaldeaths', url: `${window.location.origin}/api/total-deaths`, description: "Total deaths across all bosses" },
        { name: '!setdeaths', url: `${window.location.origin}/api/setdeaths?boss=$(1)&count=$(2)`, description: "Manually set death count" }
      ];
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Command copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card data-testid={`card-api-info-${type}`}>
      <CardHeader>
        <CardTitle>{type === 'uninstall' ? 'Uninstall Tracker' : 'Death Counter'} Nightbot Setup</CardTitle>
        <CardDescription>
          Commands to add to your Nightbot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {getCommands().map((cmd) => (
          <div key={cmd.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{cmd.name}</p>
              {"description" in cmd && <p className="text-xs text-muted-foreground">{cmd.description}</p>}
            </div>
            <div className="bg-muted p-2 rounded-md flex items-center gap-2">
              <code className="text-xs font-mono break-all flex-1">
                $(urlfetch {cmd.url})
              </code>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(`$(urlfetch ${cmd.url})`)}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// --- Death Counter Dashboard ---
function DeathCounter() {
  const { data: bosses, isLoading } = useQuery<Boss[]>({ queryKey: ['/api/bosses'] });
  
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <ApiInfo type="death" />
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
            <CardDescription>Active boss tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <div className="space-y-4">
                {bosses?.filter(b => !b.isBeaten).map(boss => (
                  <div key={boss.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-lg font-bold">{boss.name}</p>
                      <p className="text-sm text-muted-foreground">Currently Fighting</p>
                    </div>
                    <div className="text-3xl font-black text-primary">{boss.deathCount}</div>
                  </div>
                ))}
                {!bosses?.some(b => !b.isBeaten) && (
                  <div className="text-center py-8 text-muted-foreground italic">
                    No active boss. Use !death &lt;name&gt; in chat to start one!
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hall of Shame (Boss History)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Boss Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Deaths</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bosses?.sort((a,b) => b.deathCount - a.deathCount).map((boss) => (
                <TableRow key={boss.id}>
                  <TableCell className="font-medium">{boss.name}</TableCell>
                  <TableCell>
                    {boss.isBeaten ? (
                      <span className="flex items-center gap-1 text-green-500 font-bold">
                        <Trophy className="h-4 w-4" /> Beaten
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <Skull className="h-4 w-4" /> Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-lg">{boss.deathCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Uninstall Tracker Components ---
function UninstallTracker() {
  return (
    <div className="space-y-6">
      <ApiInfo type="uninstall" />
      <UninstallTester />
      <RequestsTable />
    </div>
  );
}

function UninstallTester() {
  const [program, setProgram] = useState("");
  const [response, setResponse] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (programName: string) => {
      const res = await fetch(`/api/uninstall?program=${encodeURIComponent(programName)}`);
      if (!res.ok) throw new Error("Failed");
      return res.text();
    },
    onSuccess: (data) => {
      setResponse(data);
      queryClient.invalidateQueries({ queryKey: ['/api/uninstall/all'] });
    }
  });

  return (
    <Card>
      <CardHeader><CardTitle>Test !uninstall</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); mutation.mutate(program); }}>
          <Input placeholder="Program name..." value={program} onChange={e => setProgram(e.target.value)} />
          <Button type="submit" disabled={mutation.isPending}>Test</Button>
        </form>
        {response && <div className="p-3 bg-muted rounded font-mono text-sm">{response}</div>}
      </CardContent>
    </Card>
  );
}

function RequestsTable() {
  const { data: requests, isLoading } = useQuery<UninstallRequest[]>({ queryKey: ['/api/uninstall/all'] });
  return (
    <Card>
      <CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Program</TableHead>
                <TableHead className="text-right">Requests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{r.programName}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter">MANGO'S TRACKER</h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest">Twitch Community Tools</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="deaths" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="deaths" className="flex items-center gap-2">
              <Skull className="h-4 w-4" /> Death Counter
            </TabsTrigger>
            <TabsTrigger value="uninstall" className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4" /> Uninstall Tracker
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="deaths"><DeathCounter /></TabsContent>
          <TabsContent value="uninstall"><UninstallTracker /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
