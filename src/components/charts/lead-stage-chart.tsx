"use client";

import { useTheme } from "next-themes";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ordinalGoldRamp } from "@/lib/color-ramp";

const chartConfig = {
  total: { label: "Leads" },
} satisfies ChartConfig;

export function LeadStageChart({ stages }: { stages: { nome: string; total: number }[] }) {
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";
  const colors = ordinalGoldRamp(stages.length, mode);

  const hasData = stages.some((s) => s.total > 0);
  if (!hasData) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Ainda sem leads no quadro.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-48 w-full">
      <BarChart data={stages} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="nome"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 11 }}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {stages.map((stage, i) => (
            <Cell key={stage.nome} fill={colors[i]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
