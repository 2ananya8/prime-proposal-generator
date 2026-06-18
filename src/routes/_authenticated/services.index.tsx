import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listServices } from "@/lib/data-api";
import { Plus, Wrench } from "lucide-react";

export const Route = createFileRoute("/_authenticated/services/")({
  head: () => ({ meta: [{ title: "Services — Prime Infoserv" }] }),
  component: ServicesList,
});

function ServicesList() {
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
          {(data ?? []).map((s: any) => (
            <Link key={s.id} to="/services/$id" params={{ id: s.id }}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.service_type}{s.short_code ? ` · ${s.short_code}` : ""}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
