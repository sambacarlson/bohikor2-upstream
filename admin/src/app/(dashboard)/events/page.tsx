"use client";

import { useEvents } from "@/hooks/use-events";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function EventsPage() {
  const { data, isLoading } = useEvents();

  if (isLoading) {
    return <div className="text-muted-foreground">Loading events...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground">
          System activity log
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Metadata</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Badge variant="outline">{event.event_type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.user_id ? `${event.user_id.slice(0, 8)}...` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.admin_id ? `${event.admin_id.slice(0, 8)}...` : "—"}
                  </TableCell>
                  <TableCell className="max-w-[300px] font-mono text-xs">
                    {event.metadata
                      ? JSON.stringify(event.metadata).slice(0, 50) + "..."
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(event.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
