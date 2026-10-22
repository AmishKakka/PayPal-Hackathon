"use client";

import React, { useMemo, useState, useEffect } from "react";
import { AgCharts } from "ag-charts-react";
import { AgChartOptions, ModuleRegistry, AllCommunityModule } from "ag-charts-community";
import { ChartConfig } from "@/lib/api";

// Register AG Charts Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface AGChartWrapperProps {
  config: ChartConfig;
  height?: number;
}

export function AGChartWrapper({ config, height = 300 }: AGChartWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartOptions = useMemo<AgChartOptions>(() => {
    const textColor = "#000000";
    const subtextColor = "#4A5568";
    const legendColor = "#4A5568";
    const paypalColors = ["#002991", "#008CFF", "#10b981", "#6366f1", "#f59e0b"];

    // 1. Donut / Pie Chart format
    if (config.type === "donut" || config.type === "pie") {
      const data = config.categories.map((cat, idx) => ({
        label: cat,
        value: config.datasets[0]?.data[idx] ?? 0,
      }));

      return {
        theme: "ag-default",
        background: { fill: "transparent" },
        title: {
          text: config.title,
          color: textColor,
          fontSize: 15,
          fontWeight: "bold",
        },
        subtitle: config.description
          ? { text: config.description, color: subtextColor, fontSize: 11 }
          : undefined,
        data,
        series: [
          {
            type: config.type === "donut" ? "donut" : "pie",
            angleKey: "value",
            legendItemKey: "label",
            calloutLabelKey: "label",
            sectorLabelKey: "value",
            outerRadiusRatio: 0.62,
            innerRadiusRatio: 0.38,
            fills: paypalColors,
            strokes: ["#ffffff"],
            strokeWidth: 2,
          },
        ],
        legend: {
          position: "bottom",
          pagination: {
            enabled: true,
          },
          item: {
            label: { color: legendColor, fontSize: 11 },
          },
        },
      } as unknown as AgChartOptions;
    }

    // 2. Bar / Column / Line Chart format
    const rowData = config.categories.map((cat, catIdx) => {
      const row: Record<string, string | number> = { category: cat };
      config.datasets.forEach((ds) => {
        row[ds.label] = ds.data[catIdx] ?? 0;
      });
      return row;
    });

    const isLine = config.type === "line" || config.type === "area";
    const series = config.datasets.map((ds, idx) => {
      const color = ds.color || paypalColors[idx % paypalColors.length];

      if (isLine) {
        return {
          type: "line" as const,
          xKey: "category",
          yKey: ds.label,
          yName: ds.label,
          stroke: color,
          strokeWidth: 3,
          marker: {
            size: 6,
            fill: color,
            stroke: "#ffffff",
            strokeWidth: 2,
          },
        };
      }

      return {
        type: "bar" as const,
        xKey: "category",
        yKey: ds.label,
        yName: ds.label,
        fill: color,
        cornerRadius: 4,
      };
    });

    return {
      theme: "ag-default",
      background: { fill: "transparent" },
      title: {
        text: config.title,
        color: textColor,
        fontSize: 15,
        fontWeight: "bold",
      },
      subtitle: config.description
        ? { text: config.description, color: subtextColor, fontSize: 11 }
        : undefined,
      data: rowData,
      series,
      legend: {
        position: "bottom",
        item: {
          label: { color: legendColor, fontSize: 11 },
        },
      },
    } as unknown as AgChartOptions;
  }, [config]);

  if (!mounted) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full rounded-xl overflow-hidden bg-[#F5F7FA] p-4 border border-[#E2E8F0] animate-pulse flex items-center justify-center text-xs text-[#94A3B8]"
      >
        Initializing AG Chart...
      </div>
    );
  }

  return (
    <div
      style={{ height: `${height}px` }}
      className="w-full rounded-xl overflow-hidden p-2"
    >
      <AgCharts options={chartOptions} modules={[AllCommunityModule]} />
    </div>
  );
}
