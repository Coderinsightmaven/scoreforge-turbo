"use client";

import Link from "next/link";
import { Drawer } from "vaul";
import { Braces, Plus, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CommandQuickDrawer(): React.ReactNode {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <Button variant="outline" size="sm" id="onborda-command-quick">
          Command Panel
        </Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-3xl border border-border/70 bg-bg-primary px-6 pb-6 pt-4 shadow-[var(--shadow-lg)]">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
          <div className="space-y-2">
            <p className="text-caption text-muted-foreground">Quick Command</p>
            <h3 className="text-heading">Launch a workflow</h3>
            <p className="text-sm text-muted-foreground">
              Jump straight into bracket creation, scoring, or settings.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <Button variant="brand" size="lg" asChild>
              <Link href="/tournaments/new">
                <Plus className="h-4 w-4" />
                New Tournament
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/brackets/quick">
                <Braces className="h-4 w-4" />
                Quick Bracket
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                Command Settings
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/admin">
                <Users className="h-4 w-4" />
                Site Admin
              </Link>
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
