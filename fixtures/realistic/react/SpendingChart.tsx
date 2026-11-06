import { useTheme } from './theme/theme';
import { palette } from './theme/tokens';

interface Point {
  month: string;
  value: number;
}

export function SpendingChart({ data }: { data: Point[] }) {
  const { theme } = useTheme();
  const colors = palette[theme ?? 'light'];
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure className="card">
      <figcaption className="t-title">Spending by month</figcaption>
      <svg viewBox="0 0 300 120" role="img" aria-label="Bar chart of monthly spending">
        {data.map((d, i) => (
          <rect key={d.month} x={i * 50 + 10} y={120 - (d.value / max) * 110} width="30" height={(d.value / max) * 110} fill={colors.accent} rx="4" />
        ))}
      </svg>
    </figure>
  );
}
