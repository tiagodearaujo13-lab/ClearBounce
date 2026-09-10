/**
 * @module components/ui/Card
 * @description Card com glassmorphism para containers de conteúdo.
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function Card({ children, className = '', title, description }: CardProps) {
  return (
    <div className={`glass-card p-8 ${className}`}>
      {title && <h3 className="mb-1 text-xl font-semibold">{title}</h3>}
      {description && (
        <p className="mb-6 text-sm text-surface-200">{description}</p>
      )}
      {children}
    </div>
  );
}
