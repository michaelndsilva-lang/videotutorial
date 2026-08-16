import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { GeracoesPorDiaChart } from "./geracoes-por-dia-chart";
import { FORMATO_LABEL } from "@/lib/content/labels";
import type { FormatoConteudo } from "@/lib/types/database.types";

export default async function AdminConteudoMetricasPage() {
  const supabase = await createClient();

  const desde = new Date();
  desde.setDate(desde.getDate() - 35);

  const { data } = await supabase
    .from("conteudo_geracoes")
    .select("usuario_id, formato, created_at, tokens_consumidos, usuarios(nome_completo, email)")
    .gte("created_at", desde.toISOString());

  const rows = data ?? [];
  const agora = new Date();

  const dias: { dia: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(agora);
    d.setDate(d.getDate() - i);
    const chave = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const total = rows.filter((r) => r.created_at.slice(0, 10) === chave).length;
    dias.push({ dia: label, total });
  }

  const seteDiasAtras = new Date(agora);
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const geracoes7d = rows.filter((r) => new Date(r.created_at) >= seteDiasAtras);
  const membrosAtivos7d = new Set(geracoes7d.map((r) => r.usuario_id)).size;

  const contagemFormato = new Map<FormatoConteudo, number>();
  for (const r of rows) {
    contagemFormato.set(r.formato, (contagemFormato.get(r.formato) ?? 0) + 1);
  }
  const formatoMaisUsado = [...contagemFormato.entries()].sort((a, b) => b[1] - a[1])[0];

  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const tokensNoMes = rows
    .filter((r) => new Date(r.created_at) >= inicioMes)
    .reduce((soma, r) => soma + (r.tokens_consumidos ?? 0), 0);

  const contagemPorMembro = new Map<string, { nome: string; total: number }>();
  for (const r of rows) {
    const nome = r.usuarios?.nome_completo || r.usuarios?.email || "—";
    const atual = contagemPorMembro.get(r.usuario_id) ?? { nome, total: 0 };
    atual.total += 1;
    contagemPorMembro.set(r.usuario_id, atual);
  }
  const ranking = [...contagemPorMembro.values()].sort((a, b) => b.total - a.total).slice(0, 5);

  const cards = [
    { label: "Gerações últimos 7 dias", value: String(geracoes7d.length) },
    { label: "Membros ativos no motor (7d)", value: String(membrosAtivos7d) },
    { label: "Formato mais usado", value: formatoMaisUsado ? FORMATO_LABEL[formatoMaisUsado[0]] : "—" },
    { label: "Tokens consumidos no mês", value: tokensNoMes.toLocaleString("pt-BR") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Motor de Conteúdo" title="Métricas" description="Uso do motor pelos membros." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gerações por dia (últimos 14 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <GeracoesPorDiaChart dados={dias} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking — quem mais gera</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead className="text-right">Gerações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                    Nenhuma geração ainda.
                  </TableCell>
                </TableRow>
              ) : (
                ranking.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="text-right">{m.total}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
