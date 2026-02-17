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
import { Loader2, Trash2, Copy, Check, Terminal, Skull, Trophy, ListOrdered, Settings2, Hash } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UninstallRequest, Boss, Player as Channel } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- API Info Component ---
function ApiInfo({ type, channel }: { type: 'uninstall' | 'death', channel: Channel }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const getCommands = () => {
    const channelParam = `&channel=$(channel)`;
    if (type === 'uninstall') {
      const apiUrl = `${window.location.origin}/api/uninstall?program=$(query)${channelParam}`;
      return [
        { name: '!uninstall', url: apiUrl, description: "Track program uninstalls" }
      ];
    } else {
      return [
        { name: '!death', url: `${window.location.origin}/api/death?boss=$(query)${channelParam}`, description: "Add death to boss" },
        { name: '!deaths', url: `${window.location.origin}/api/deaths?boss=$(query)${channelParam}`, description: "Show deaths stats" },
        { name: '!beaten', url: `${window.location.origin}/api/beaten?boss=$(query)${channelParam}`, description: "Mark boss as beaten" },
        { name: '!totaldeaths', url: `${window.location.origin}/api/total-deaths?channel=$(channel)`, description: "Total deaths" },
        { name: '!setdeaths', url: `${window.location.origin}/api/setdeaths?boss=$(1)&count=$(2)${channelParam}`, description: "Manually set deaths" }
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
    <Card>
      <CardHeader>
        <CardTitle>{type === 'uninstall' ? 'Uninstall Tracker' : 'Death Counter'} Nightbot Setup</CardTitle>
        <CardDescription>
          Commands for channel: <span className="font-bold text-primary">{channel.name}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {getCommands().map((cmd) => (
          <div key={cmd.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{cmd.name}</p>
              <p className="text-xs text-muted-foreground">{cmd.description}</p>
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

// --- Channel Settings ---
function ChannelSettings({ channel }: { channel: Channel }) {
  const [name, setName] = useState(channel.name);
  const { toast } = useToast();
  
  const updateMutation = useMutation({
    mutationFn: async (newName: string) => {
      return await apiRequest('POST', `/api/channels/${channel.id}`, { name: newName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      toast({ title: "Updated", description: "Channel display name updated" });
    }
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/channels/${channel.id}/reset`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bosses'] });
      toast({ title: "Reset complete", description: `All deaths for ${channel.name} have been cleared` });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" /> Settings for {channel.id}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">Display Name (Player Name)</label>
          <div className="flex gap-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Display name..." />
            <Button onClick={() => updateMutation.mutate(name)} disabled={updateMutation.isPending}>
              Update
            </Button>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full" disabled={resetMutation.isPending}>
                <Trash2 className="mr-2 h-4 w-4" /> Reset Channel Deaths
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all death records for the channel "{channel.id}". This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetMutation.mutate()} className="bg-destructive text-destructive-foreground">
                  Reset Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Death Counter Dashboard ---
function DeathCounter({ channel }: { channel: Channel }) {
  const { data: bosses, isLoading } = useQuery<Boss[]>({ 
    queryKey: ['/api/bosses', { channel: channel.id }],
    queryFn: () => fetch(`/api/bosses?channel=${channel.id}`).then(res => res.json())
  });
  
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <ApiInfo type="death" channel={channel} />
        <div className="space-y-6">
          <ChannelSettings channel={channel} />
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
              <CardDescription>Active boss tracking for {channel.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Loader2 className="animate-spin" /> : (
                <div className="space-y-4">
                  {bosses?.filter(b => !b.isBeaten).map(boss => (
                    <div key={boss.id} className="flex items-center justify-between p-4 bg-muted rounded-lg border-l-4 border-l-primary">
                      <div>
                        <p className="text-lg font-bold">{boss.name}</p>
                        <p className="text-sm text-muted-foreground uppercase tracking-widest text-[10px]">Currently Fighting</p>
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
                  <TableCell className="font-bold">{boss.name}</TableCell>
                  <TableCell>
                    {boss.isBeaten ? (
                      <span className="flex items-center gap-1 text-green-500 font-bold uppercase text-[10px] tracking-widest">
                        <Trophy className="h-3 w-3" /> Beaten
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-bold uppercase text-[10px] tracking-widest">
                        <Skull className="h-3 w-3" /> Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-black text-lg">{boss.deathCount}</TableCell>
                </TableRow>
              ))}
              {(!bosses || bosses.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                    No history yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Uninstall Tracker Components ---
function UninstallTracker({ channel }: { channel: Channel }) {
  const { data: requests, isLoading } = useQuery<UninstallRequest[]>({ 
    queryKey: ['/api/uninstall/all', { channel: channel.id }],
    queryFn: () => fetch(`/api/uninstall/all?channel=${channel.id}`).then(res => res.json())
  });

  const [testProgram, setTestProgram] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const testMutation = useMutation({
    mutationFn: async (program: string) => {
      const res = await fetch(`/api/uninstall?program=${encodeURIComponent(program)}&channel=${channel.id}`);
      return res.text();
    },
    onSuccess: (data) => {
      setTestResponse(data);
      queryClient.invalidateQueries({ queryKey: ['/api/uninstall/all', { channel: channel.id }] });
    }
  });

  return (
    <div className="space-y-6">
      <ApiInfo type="uninstall" channel={channel} />
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Test !uninstall</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); testMutation.mutate(testProgram); }}>
              <Input placeholder="Program name..." value={testProgram} onChange={e => setTestProgram(e.target.value)} />
              <Button type="submit" disabled={testMutation.isPending}>Test</Button>
            </form>
            {testResponse && <div className="p-3 bg-muted rounded font-mono text-sm">{testResponse}</div>}
          </CardContent>
        </Card>

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
                  {(!requests || requests.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                        No requests yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: channels, isLoading } = useQuery<Channel[]>({ queryKey: ['/api/channels'] });
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  const activeChannel = channels?.find(c => c.id === selectedChannelId) || channels?.find(c => c.isDefault) || channels?.[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Terminal className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">Community Tracker</h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest text-[10px]">Twitch Multi-Channel Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted p-2 rounded-lg border">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <Select value={activeChannel?.id} onValueChange={setSelectedChannelId}>
              <SelectTrigger className="w-[200px] border-0 bg-transparent focus:ring-0">
                <SelectValue placeholder="Select Channel" />
              </SelectTrigger>
              <SelectContent>
                {channels?.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.id} ({c.name})
                  </SelectItem>
                ))}
                {(!channels || channels.length === 0) && (
                  <div className="p-2 text-xs text-muted-foreground">No channels active yet</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : activeChannel ? (
          <Tabs defaultValue="deaths" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="deaths" className="flex items-center gap-2">
                <Skull className="h-4 w-4" /> Death Counter
              </TabsTrigger>
              <TabsTrigger value="uninstall" className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4" /> Uninstall Tracker
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="deaths"><DeathCounter channel={activeChannel} /></TabsContent>
            <TabsContent value="uninstall"><UninstallTracker channel={activeChannel} /></TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed">
            <h2 className="text-xl font-bold mb-2">No active channels</h2>
            <p className="text-muted-foreground">Use a command in your Twitch chat to register your channel!</p>
          </div>
        )}
      </div>
    </div>
  );
}
