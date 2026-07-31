"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Paleta categórica (2 slots) validada com scripts/validate_palette.js do
// skill dataviz: CVD ΔE 27+ (target 8), normal-vision ΔE 30+ (floor 15),
// contraste >=3:1 nos dois modos — ver referências no PR.
const chartConfig = {
  manual: {
    label: "Manual",
    theme: { light: "#2a78d6", dark: "#3987e5" },
  },
  agente_ia: {
    label: "Agente IA",
    theme: { light: "#B45309", dark: "#D97706" },
  },
} satisfies ChartConfig;

export function LeadOriginChart({ manual, agenteIa }: { manual: number; agenteIa: number }) {
  const total = manual + agenteIa;

  if (total === 0) {
    return (
      <p className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        Ainda sem leads registrados.
      </p>
    );
  }

  const data = [{ name: "Leads", manual, agente_ia: agenteIa }];

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-24 w-full">
      <BarChart
        data={data}
        layout="vertical"
        barSize={32}
        margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
      >
        <XAxis type="number" hide domain={[0, total]} />
        <YAxis type="category" dataKey="name" hide />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="manual" stackId="a" fill="var(--color-manual)" radius={[6, 0, 0, 6]}>
          {manual > 0 && (
            <LabelList
              dataKey="manual"
              position="center"
              className="fill-white text-xs font-medium"
            />
          )}
        </Bar>
        <Bar dataKey="agente_ia" stackId="a" fill="var(--color-agente_ia)" radius={[0, 6, 6, 0]}>
          {agenteIa > 0 && (
            <LabelList
              dataKey="agente_ia"
              position="center"
              className="fill-white text-xs font-medium"
            />
          )}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
