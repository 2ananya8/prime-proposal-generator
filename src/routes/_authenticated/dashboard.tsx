import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { countServices, listRecentProposals } from "@/lib/data-api";
import { FileText, Wrench, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Prime Infoserv" }] }),
  component: Dashboard,
});

function Dashboard() {
  const services = useQuery({ queryKey: ["services-count"], queryFn: countServices });
  const proposals = useQuery({ queryKey: ["proposals-recent"], queryFn: listRecentProposals });
  return (
    <div className="max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-sm text-muted-foreground">Build proposals from reusable service templates.</p></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />Services</CardTitle><CardDescription>{services.data ?? 0} templates</CardDescription></div><Link to="/services/new"><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />New</Button></Link></CardHeader>
          <CardContent><Link to="/services" className="text-sm text-primary underline">Manage services →</Link></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Proposals</CardTitle><CardDescription>Generate DOCX & PDF</CardDescription></div><Link to="/proposals/new"><Button size="sm"><Plus className="h-4 w-4 mr-1" />Generate</Button></Link></CardHeader>
          <CardContent><Link to="/proposals" className="text-sm text-primary underline">View all proposals →</Link></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent proposals</CardTitle></CardHeader>
        <CardContent>
          {(proposals.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
            <ul className="divide-y">
              {(proposals.data ?? []).map((p: any) => (
                <li key={p.id} className="py-2 flex justify-between items-center">
                  <Link to="/proposals/$id" params={{ id: p.id }} className="text-sm font-medium hover:underline">{p.client_name}</Link>
                  <span className="text-xs text-muted-foreground">{p.service?.name} · {p.proposal_date}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
