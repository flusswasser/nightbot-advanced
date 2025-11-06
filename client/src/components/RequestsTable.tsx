import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { UninstallRequest } from "@shared/schema";

export default function RequestsTable() {
  const { data: requests, isLoading } = useQuery<UninstallRequest[]>({
    queryKey: ['/api/uninstall/all'],
  });

  return (
    <Card data-testid="card-requests">
      <CardHeader>
        <CardTitle>Uninstall Requests Leaderboard</CardTitle>
        <CardDescription>
          Programs sorted by number of uninstall requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : requests && requests.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Program Name</TableHead>
                <TableHead className="text-right">Requests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request, index) => (
                <TableRow key={request.id} data-testid={`row-request-${index}`}>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium" data-testid={`text-program-${index}`}>
                    {request.programName}
                  </TableCell>
                  <TableCell className="text-right font-bold" data-testid={`text-count-${index}`}>
                    {request.count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No requests yet. Try testing the command above!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
