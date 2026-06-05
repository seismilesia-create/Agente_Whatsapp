import { cn } from '@/shared/lib/utils'

type BadgeVariant = 'default' | 'ai' | 'human' | 'contact' | 'muted'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary',
  ai: 'bg-ai/10 text-ai',
  human: 'bg-human/10 text-human',
  contact: 'bg-muted text-muted-foreground',
  muted: 'bg-muted text-muted-foreground',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
