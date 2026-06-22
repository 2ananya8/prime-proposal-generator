import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ServiceForm, emptyService, type ServiceFormValue } from "@/components/ServiceForm";
import { createService } from "@/lib/data-api";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/services/new")({
  head: () => ({ meta: [{ title: "New service — Prime Infoserv" }] }),
  component: NewService,
});

function NewService() {
  const nav = useNavigate();
  const [v, setV] = useState<ServiceFormValue>(emptyService);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!v.name || !v.service_type) return toast.error("Name and Type are required");
    setBusy(true);
    try {
      const data = await createService(v);
      toast.success("Service created");
      nav({ to: "/services/$id", params: { id: data.id } });
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/services" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline"><ArrowLeft className="h-4 w-4" />Back</Link>
      <h1 className="text-2xl font-semibold">New service</h1>
      <ServiceForm value={v} onChange={setV} hideDefaultTimelinePhases />
      <div className="flex gap-2 sticky bottom-0 bg-background py-3 border-t"><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save service"}</Button></div>
    </div>
  );
}
