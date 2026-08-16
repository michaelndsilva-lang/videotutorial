"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// Reaproveita o par âmbar já validado em lead-origin-chart.tsx — aqui é série
// única (sem necessidade de checar separação CVD entre pares).
const chartConfig = {
  total: {
    label: "Gerações",
    theme: { light: "#B45309", dark: "#D97706" },
  },
} satisfies ChartConfig;

export function GeracoesPorDiaChart({ dados }: { dados: { dia: string; total: number }[] }) {
  const semDados = dados.every((d) => d.total === 0);

  if (semDados) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Ainda sem gerações nesse período.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <BarChart data={dados} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
