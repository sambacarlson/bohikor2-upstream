"use client";

import { useRequests } from "@/hooks/use-requests";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const statusColors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  initiated: "secondary",
  pending: "outline",
  success: "default",
  failed: "destructive",
};

export default function RequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data, isLoading } = useRequests(1, 50, statusFilter === "all" ? undefined : statusFilter);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading requests...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
          <p className="text-muted-foreground">
            Advance request monitoring
          </p>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="initiated">Initiated</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payout Ref</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Failure Reason</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No requests found
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-mono text-xs">
                    {request.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {request.user_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{request.amount_xaf.toLocaleString()} XAF</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[request.status] || "outline"}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.campay_payout_ref || "—"}</TableCell>
                  <TableCell>
                    {request.payout_duration_seconds
                      ? `${request.payout_duration_seconds}s`
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {request.failure_reason || "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleString()}
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
