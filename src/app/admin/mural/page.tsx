import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { formatarEvento, isoParaLocal } from "@/lib/mural/agenda";
import {
  AvisoDialog,
  EventoDialog,
  ModerarConquista,
  RemoverAviso,
  RemoverEvento,
} from "./mural-admin-ui";

export default async function AdminMuralPage() {
  await requireAdmin();
  const supabase = await createClient();
  const desde = new Date();
  desde.setDate(desde.getDate() - 7);

  const [{ data: avisos }, { data: eventos }, { data: lembretes }, { data: conquistas }] = await Promise.all([
    supabase.from("avisos").select("*").order("created_at", { ascending: false }).limit(30),
    supabase.from("eventos").select("*").gte("inicio", desde.toISOString()).order("inicio"),
    supabase.from("evento_lembretes").select("evento_id"),
    supabase
      .from("conquistas")
      .select("id, texto, oculta, created_at, membros(usuarios(nome_completo, email))")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const lembretesPorEvento = new Map<string, number>();
  for (const l of lembretes ?? []) lembretesPorEvento.set(l.evento_id, (lembretesPorEvento.get(l.evento_id) ?? 0) + 1);
  const agora = new Date().getTime();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Equipe"
        title="Mural e agenda"
        description="Avisos para todos os membros, agenda de eventos e lives, e moderação das conquistas."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Avisos</CardTitle>
          <AvisoDialog />
        </CardHeader>
        <CardContent className="p-0">
          {(avisos ?? []).length === 0 ? (
            <p className="border-t px-4 py-4 text-sm text-muted-foreground">Nenhum aviso.</p>
          ) : (
            <ul className="flex flex-col divide-y border-t">
              {(avisos ?? []).map((a) => {
                const expirado = a.expira_em && new Date(a.expira_em).getTime() < agora;
                return (
                  <li key={a.id} className={`flex flex-col gap-2 px-4 py-3 ${a.ativo && !expirado ? "" : "opacity-60"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.titulo}</span>
                      {a.fixado && <Badge>Fixado</Badge>}
                      {!a.ativo && <Badge variant="outline">Oculto</Badge>}
                      {expirado && <Badge variant="outline">Expirado</Badge>}
                    </div>
                    {a.texto && <p className="line-clamp-2 text-sm text-muted-foreground">{a.texto}</p>}
                    <div className="flex gap-1.5">
                      <AvisoDialog
                        aviso={{
                          id: a.id,
                          titulo: a.titulo,
                          texto: a.texto,
                          fixado: a.fixado,
                          ativo: a.ativo,
                          expiraEm: a.expira_em ? isoParaLocal(a.expira_em) : "",
                        }}
                      />
                      <RemoverAviso id={a.id} titulo={a.titulo} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Agenda</CardTitle>
          <EventoDialog />
        </CardHeader>
        <CardContent className="p-0">
          {(eventos ?? []).length === 0 ? (
            <p className="border-t px-4 py-4 text-sm text-muted-foreground">Nenhum evento.</p>
          ) : (
            <ul className="flex flex-col divide-y border-t">
              {(eventos ?? []).map((e) => {
                const passado = new Date(e.inicio).getTime() + e.duracao_min * 60 * 1000 < agora;
                return (
                  <li key={e.id} className={`flex flex-col gap-2 px-4 py-3 ${e.ativo && !passado ? "" : "opacity-60"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-amber-700 capitalize dark:text-amber-400">{formatarEvento(e.inicio)}</span>
                      <span className="font-medium">{e.titulo}</span>
                      {!e.ativo && <Badge variant="outline">Oculto</Badge>}
                      {passado && <Badge variant="outline">Encerrado</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {lembretesPorEvento.get(e.id) ?? 0} pediram lembrete
                      {e.lembrete_enviado_em ? " · lembrete enviado" : ""}
                    </span>
                    <div className="flex gap-1.5">
                      <EventoDialog
                        evento={{
                          id: e.id,
                          titulo: e.titulo,
                          descricao: e.descricao,
                          inicio: isoParaLocal(e.inicio),
                          duracaoMin: e.duracao_min,
                          link: e.link ?? "",
                          ativo: e.ativo,
                        }}
                      />
                      <RemoverEvento id={e.id} titulo={e.titulo} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conquistas publicadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(conquistas ?? []).length === 0 ? (
            <p className="border-t px-4 py-4 text-sm text-muted-foreground">Nenhuma conquista ainda.</p>
          ) : (
            <ul className="flex flex-col divide-y border-t">
              {(conquistas ?? []).map((c) => (
                <li key={c.id} className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${c.oculta ? "opacity-60" : ""}`}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {c.membros?.usuarios?.nome_completo || c.membros?.usuarios?.email || "Membro"} ·{" "}
                      {new Date(c.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      {c.oculta ? " · oculta" : ""}
                    </span>
                    <span className="text-sm">{c.texto}</span>
                  </div>
                  <ModerarConquista id={c.id} oculta={c.oculta} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
