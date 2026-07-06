"use client";

import { createContext, useContext, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CloseContext = createContext<() => void>(() => {});

export function useEntryDialogClose() {
  return useContext(CloseContext);
}

export function EntryDialog({
  title,
  triggerLabel = "Add entry",
  children,
}: {
  title: string;
  triggerLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
        </DialogHeader>
        <CloseContext.Provider value={() => setOpen(false)}>
          {children}
        </CloseContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
