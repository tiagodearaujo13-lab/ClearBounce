/**
 * @module components/ui/Badge
 * @description Badge semântico para status de verificação.
 */

interface BadgeProps {
  status: 'valid' | 'invalid' | 'disposable' | 'unknown' | 'security_block' | 'unverifiable_network_blocked';
  children: React.ReactNode;
}

const statusClasses: Record<string, string> = {
  valid: 'badge-valid',
  invalid: 'badge-invalid',
  disposable: 'badge-disposable',
  unknown: 'badge-unknown',
  security_block: 'badge-invalid',
  unverifiable_network_blocked: 'badge-unknown',
};

export function Badge({ status, children }: BadgeProps) {
  return (
    <span className={`badge ${statusClasses[status] ?? 'badge-unknown'}`}>
      {children}
    </span>
  );
}
