"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, CheckCircle, XCircle, Clock, Timer } from "lucide-react";

const stats = [
  {
    title: "Total Users",
    value: "—",
    description: "Registered employees",
    icon: Users,
    variant: "default" as const,
  },
  {
    title: "Active Users",
    value: "—",
    description: "Currently active",
    icon: CheckCircle,
    variant: "default" as const,
  },
  {
    title: "Total Requests",
    value: "—",
    description: "All advance requests",
    icon: CreditCard,
    variant: "default" as const,
  },
  {
    title: "Successful Payouts",
    value: "—",
    description: "Completed successfully",
    icon: CheckCircle,
    variant: "default" as const,
  },
  {
    title: "Failed Payouts",
    value: "—",
    description: "Requires attention",
    icon: XCircle,
    variant: "destructive" as const,
  },
  {
    title: "Pending Payouts",
    value: "—",
    description: "In progress",
    icon: Clock,
    variant: "default" as const,
  },
  {
    title: "Avg Payout Time",
    value: "—",
    description: "Target: P50 ≤ 60s",
    icon: Timer,
    variant: "default" as const,
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Salary advance pilot overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect to the backend API to view recent activity here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
