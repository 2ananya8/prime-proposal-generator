import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listProposals } from "@/lib/data-api";
import { useAuth } from "@/lib/auth";
import { canEditProposal } from "@/lib/permissions";
import { authRequired } from "@/lib/auth-session";
import { Plus, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/proposals/")({
  head: () => ({ meta: [{ title: "Proposals — Prime Infoserv" }] }),
  component: ProposalsList,
});

function ProposalsList() {
  const auth = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: listProposals,
  });
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-semibold">Proposals</h1><p className="text-sm text-muted-foreground">Generated proposals for clients.</p></div>
        <Link to="/proposals/new"><Button><Plus className="h-4 w-4 mr-1" />New proposal</Button></Link>
      </div>
      {isLoading ? <p>Loading…</p> : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />No proposals yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((p: any) => {
            const mine = !authRequired() || canEditProposal(auth.profile, auth.user?.id, p);
            return (
            <Link key={p.id} to="/proposals/$id" params={{ id: p.id }}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex justify-between items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{p.client_name}</div>
                      {mine ? (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">Yours</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.service?.name ?? "—"} · {p.proposal_date}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded shrink-0 ${p.generated_pdf_path ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{p.generated_pdf_path ? "Generated" : "Draft"}</span>
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
