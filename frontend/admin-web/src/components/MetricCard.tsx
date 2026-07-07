import type { Metric } from "../types";

interface MetricCardProps {
  metric: Metric;
}

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className={`metric-card metric-${metric.tone}`}>
      <p>{metric.label}</p>
      <strong>{metric.value}</strong>
      <span>{metric.hint}</span>
    </article>
  );
}
