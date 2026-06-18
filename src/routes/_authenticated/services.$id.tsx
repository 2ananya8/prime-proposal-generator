import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ServiceForm, emptyService, type ServiceFormValue } from "@/components/ServiceForm";
import { deleteService, getService, updateService } from "@/lib/data-api";
import { mergePrerequisitesFields, normalizeExtraSectionsForForm } from "@/lib/service-field-helpers";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/services/$id")({
  component: EditService,
});

function EditService() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [v, setV] = useState<ServiceFormValue>(emptyService);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["service", id], queryFn: () => getService(id) });
  useEffect(() => {
    if (q.data) setV({
      name: q.data.name, service_type: q.data.service_type, short_code: q.data.short_code ?? "",
      approach_methodology: (q.data.approach_methodology as any) ?? [],
      executive_summary_template: q.data.executive_summary_template ?? "",
      project_objectives: (q.data.project_objectives as any) ?? [],
      expected_benefits: (q.data.expected_benefits as any) ?? [],
      deliverables: (q.data.deliverables as any) ?? [],
      prerequisites: mergePrerequisitesFields(
        q.data.prerequisites_prime as string[] | undefined,
        q.data.prerequisites_client as string[] | undefined,
      ),
      timeline_phases: (q.data.timeline_phases as any) ?? [],
      extra_sections: normalizeExtraSectionsForForm(q.data.extra_sections),
    });
  }, [q.data]);
  const save = async () => {
    setBusy(true);
    try {
      await updateService(id, v);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!confirm("Delete this service? Proposals using it will keep their data but lose the link.")) return;
    try {
      await deleteService(id);
      nav({ to: "/services" });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };
  if (q.isLoading) return <p>Loading…</p>;
  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/services" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline"><ArrowLeft className="h-4 w-4" />Back</Link>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Edit service</h1>
        <Button variant="ghost" size="sm" onClick={del}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
      </div>
      <ServiceForm value={v} onChange={setV} />
      <div className="flex gap-2 sticky bottom-0 bg-background py-3 border-t"><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</Button></div>
    </div>
  );
}
