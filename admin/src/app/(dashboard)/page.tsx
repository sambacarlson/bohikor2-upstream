"use client";

import { useUsers } from "@/hooks/use-users";
import { useInvitations } from "@/hooks/use-invitations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail } from "lucide-react";

export default function DashboardPage() {
  const { data: users } = useUsers();
  const { data: invitations } = useInvitations();

  const totalUsers = users?.length ?? 0;
  const totalInvitations = invitations?.length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Salary advance pilot overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvitations}</div>
            <p className="text-xs text-muted-foreground">Sent and pending</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}