import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listServices } from "@/lib/data-api";
import { useAuth } from "@/lib/auth";
import { canEditService } from "@/lib/permissions";
import { authRequired } from "@/lib/auth-session";
import { Plus, Wrench } from "lucide-react";

export const Route = createFileRoute("/_authenticated/services/")({
  head: () => ({ meta: [{ title: "Services — Prime Infoserv" }] }),
  component: ServicesList,
});

function ServicesList() {
  const auth = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: listServices,
  });
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-semibold">Services</h1><p className="text-sm text-muted-foreground">Reusable templates for proposals.</p></div>
        <Link to="/services/new"><Button><Plus className="h-4 w-4 mr-1" />New service</Button></Link>
      </div>
      {isLoading ? <p>Loading…</p> : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"><Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />No services yet. Create your first one.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {(data ?? []).map((s: any) => {
            const mine = !authRequired() || canEditService(auth.profile, auth.user?.id, s);
            return (
            <Link key={s.id} to="/services/$id" params={{ id: s.id }}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{s.name}</div>
                    {mine ? (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">Yours</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">View</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.service_type}{s.short_code ? ` · ${s.short_code}` : ""}</div>
                </CardContent>
              </Card>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
