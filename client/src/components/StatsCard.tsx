import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface StatsCardProps {
  program: string;
  count: number;
}

export default function StatsCard({ program, count }: StatsCardProps) {
  return (
    <Card data-testid={`card-stats-${program}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{program}</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`text-count-${program}`}>
          {count}
        </div>
        <p className="text-xs text-muted-foreground">
          {count === 1 ? 'request' : 'requests'}
        </p>
      </CardContent>
    </Card>
  );
}
