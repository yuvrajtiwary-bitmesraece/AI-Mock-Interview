"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { Download, LoaderCircle, Trash2, TriangleAlert, UserRound } from "lucide-react";

import { deleteMyData, exportMyData } from "@/actions/interview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Opens Clerk's account screen (name, email, password, connected accounts). */
export function ManageAccountButton() {
  const { openUserProfile } = useClerk();
  return (
    <Button type="button" variant="glass" onClick={() => openUserProfile()}>
      <UserRound /> Manage account
    </Button>
  );
}

/** Downloads everything stored for the user as a JSON file. */
export function ExportButton() {
  const [pending, setPending] = useState(false);

  const download = async () => {
    setPending(true);
    try {
      const result = await exportMyData();
      if (!result?.success) {
        toast.error(result?.error ?? "Could not export your data.");
        return;
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai-mock-interview-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.data.interviews.length} interviews.`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button type="button" variant="glass" onClick={download} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <Download />} Download my data
    </Button>
  );
}

/** Deletes all interviews, answers and usage records after typing DELETE. */
export function DeleteAllButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  const remove = async () => {
    setPending(true);
    try {
      const result = await deleteMyData(confirmation);
      if (result?.success) {
        toast.success(`Deleted ${result.deletedInterviews} ${result.deletedInterviews === 1 ? "interview" : "interviews"} and all related data.`);
        setOpen(false);
        router.push("/dashboard");
        router.refresh();
        return;
      }
      toast.error(result?.error ?? "Could not delete your data.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setPending(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmation("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="destructive-soft">
          <Trash2 /> Delete all my data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-red-400/25 bg-red-400/10">
            <TriangleAlert className="h-5 w-5 text-red-300" aria-hidden="true" />
          </span>
          <DialogTitle className="mt-2">Delete all your data?</DialogTitle>
          <DialogDescription>
            Every interview, answer, piece of feedback and report you have will be permanently deleted. This can&apos;t be undone. Your
            sign-in account stays; delete it from Manage account if you want to.
          </DialogDescription>
        </DialogHeader>
        <label className="block text-sm">
          Type <span className="font-mono font-semibold">DELETE</span> to confirm
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            className="mt-2 font-mono"
          />
        </label>
        <DialogFooter>
          <Button variant="glass" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={remove} disabled={pending || confirmation !== "DELETE"}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Delete everything
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
