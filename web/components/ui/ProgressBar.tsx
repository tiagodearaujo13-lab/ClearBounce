/**
 * @module components/ui/ProgressBar
 * @description Barra de progresso animada com acessibilidade WCAG AA.
 */

interface ProgressBarProps {
  /** Valor atual (0-100) */
  value: number;
  /** Label acessível */
  label?: string;
  /** Mostrar porcentagem */
  showPercentage?: boolean;
  /** Variante de cor */
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

const variantGradients: Record<string, string> = {
  primary: 'from-primary-600 to-primary-400',
  success: 'from-success-600 to-success-400',
  warning: 'from-warning-600 to-warning-400',
  danger: 'from-danger-600 to-danger-400',
};

export function ProgressBar({
  value,
  label = 'Progresso',
  showPercentage = true,
  variant = 'primary',
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-surface-200">{label}</span>
        {showPercentage && (
          <span className="text-sm font-medium text-white">
            {clampedValue}%
          </span>
        )}
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-surface-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${variantGradients[variant]} transition-all duration-500 ease-out`}
          style={{ width: `${clampedValue}%` }}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${clampedValue}%`}
        />
      </div>
    </div>
  );
}
