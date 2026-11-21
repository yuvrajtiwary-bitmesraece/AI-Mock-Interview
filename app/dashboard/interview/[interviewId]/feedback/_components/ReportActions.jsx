"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle, Printer, RotateCcw } from "lucide-react";

import { retakeInterview } from "@/actions/interview";
import { Button } from "@/components/ui/button";

/** Opens the print dialog with every section expanded ("Save as PDF" works too). */
export function PrintButton() {
  const print = () => {
    document.querySelectorAll("details").forEach((details) => {
      details.open = true;
    });
    window.print();
  };

  return (
    <Button type="button" variant="glass" onClick={print}>
      <Printer /> Save as PDF
    </Button>
  );
}

/** Starts a new attempt with the same questions. */
export function RetakeButton({ mockId }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const retake = async () => {
    setPending(true);
    try {
      const result = await retakeInterview(mockId);
      if (result?.success) {
        router.push(`/dashboard/interview/${result.mockId}`);
        return;
      }
      toast.error(result?.error ?? "Could not start a new attempt.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setPending(false);
  };

  return (
    <Button type="button" variant="glass" onClick={retake} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <RotateCcw />} Practice again
    </Button>
  );
}
