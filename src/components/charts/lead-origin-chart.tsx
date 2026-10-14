"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ORIGENS, ORIGEM_COR, ORIGEM_LABEL } from "@/lib/kanban/origem";
import type { CardOrigem } from "@/lib/types/database.types";

const chartConfig = Object.fromEntries(
  ORIGENS.map((o) => [o, { label: ORIGEM_LABEL[o], theme: ORIGEM_COR[o] }])
) satisfies ChartConfig;

// Barra empilhada única (parte de um todo) + lista com as contagens por
// extenso: a cor nunca é a única pista (aqua/magenta ficam <3:1 no claro).
export function LeadOriginChart({ contagens }: { contagens: Record<CardOrigem, number> }) {
  const presentes = ORIGENS.filter((o) => contagens[o] > 0);
  const total = presentes.reduce((t, o) => t + contagens[o], 0);

  if (total === 0) {
    return (
      <p className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        Ainda sem leads registrados.
      </p>
    );
  }

  const data = [{ name: "Leads", ...contagens }];

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer config={chartConfig} className="aspect-auto h-10 w-full">
        <BarChart data={data} layout="vertical" barSize={28} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, total]} />
          <YAxis type="category" dataKey="name" hide />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          {presentes.map((o, i) => (
            <Bar
              key={o}
              dataKey={o}
              stackId="a"
              fill={`var(--color-${o})`}
              stroke="var(--background)"
              strokeWidth={2}
              radius={
                presentes.length === 1
                  ? 6
                  : i === 0
                    ? [6, 0, 0, 6]
                    : i === presentes.length - 1
                      ? [0, 6, 6, 0]
                      : 0
              }
            />
          ))}
        </BarChart>
      </ChartContainer>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {presentes.map((o) => (
          <li key={o} className="flex items-center gap-1.5">
            {/* As vars --color-* só existem dentro do ChartContainer. */}
            <span className="size-2.5 rounded-sm dark:hidden" style={{ background: ORIGEM_COR[o].light }} aria-hidden />
            <span className="hidden size-2.5 rounded-sm dark:block" style={{ background: ORIGEM_COR[o].dark }} aria-hidden />
            <span className="text-foreground">{ORIGEM_LABEL[o]}</span>
            <span className="tabular-nums">
              {contagens[o]} ({Math.round((contagens[o] / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
