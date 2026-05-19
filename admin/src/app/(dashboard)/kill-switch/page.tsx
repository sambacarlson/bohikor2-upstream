"use client";

import { useKillSwitch, useToggleKillSwitch } from "@/hooks/use-kill-switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function KillSwitchPage() {
  const { data, isLoading } = useKillSwitch();
  const toggleMutation = useToggleKillSwitch();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = (checked: boolean) => {
    setIsToggling(true);
    toggleMutation.mutate(checked, {
      onSuccess: () => {
        toast.success(
          checked
            ? "Kill switch activated — new requests blocked"
            : "Kill switch deactivated — requests allowed"
        );
        setIsToggling(false);
      },
      onError: () => {
        toast.error("Failed to toggle kill switch");
        setIsToggling(false);
      },
    });
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading kill switch status...</div>;
  }

  const isActive = data?.active === true;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Kill Switch</h1>
        <p className="text-muted-foreground">
          Emergency control for advance requests
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isActive ? (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              )}
              Global Kill Switch
            </CardTitle>
            <CardDescription>
              When activated, all new advance requests are blocked. In-flight
              payouts will complete but are flagged for manual review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base font-medium">
                  Kill Switch Status
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? "Active — New requests are blocked"
                    : "Inactive — Requests are allowed"}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                disabled={isToggling}
              />
            </div>

            {isActive && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Kill Switch Active</AlertTitle>
                <AlertDescription>
                  All new advance requests are being blocked. In-flight payouts
                  will complete but are flagged for manual admin review.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What happens when activated?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>New advance requests are immediately rejected</li>
              <li>
                In-flight payouts (initiated/pending) continue to process
              </li>
              <li>
                Completed in-flight payouts are flagged for manual review
              </li>
              <li>Users see a service unavailable message</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
