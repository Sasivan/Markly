"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

interface DomainDistributionProps {
  topDomains: { domain: string; count: number }[];
  tagDistribution: { name: string; color: string; count: number }[];
  onSelectDomain?: (domain: string) => void;
  onSelectTag?: (tag: string) => void;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#64748b",
];

export function DomainDistribution({
  topDomains,
  tagDistribution,
  onSelectDomain,
  onSelectTag,
}: DomainDistributionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
      {/* Top Domains Donut */}
      <div className="flex flex-col h-full">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Top Domains
        </h4>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topDomains}
                dataKey="count"
                nameKey="domain"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                cursor="pointer"
                onClick={(entry: any) => onSelectDomain && entry?.domain && onSelectDomain(entry.domain)}
              >
                {topDomains.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border p-2 rounded shadow-md text-xs">
                        <p className="font-semibold">{data.domain}</p>
                        <p className="text-muted-foreground">{data.count} bookmarks (click to filter)</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tag Distribution Bar */}
      <div className="flex flex-col h-full">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Popular Tags
        </h4>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tagDistribution}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "currentColor" }}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border p-2 rounded shadow-md text-xs">
                        <p className="font-semibold">#{data.name}</p>
                        <p className="text-muted-foreground">{data.count} bookmarks (click to filter)</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(entry: any) => onSelectTag && entry?.name && onSelectTag(entry.name)}
              >
                {tagDistribution.map((entry, index) => (
                  <Cell key={`cell-tag-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
