"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/staff/logout", { method: "POST" });
        router.replace("/staff/login");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
