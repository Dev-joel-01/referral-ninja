import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hover = false, glow = false, padding = 'md', ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-ninja-dark/70 backdrop-blur-xl border border-ninja-green/20 rounded-3xl',
          paddingClasses[padding],
          hover && 'transition-all duration-300 hover:border-ninja-green/40 hover:-translate-y-0.5',
          glow && 'shadow-glow',
          hover && !glow && 'hover:shadow-glow',
          className
        )}
        style={{
          boxShadow: glow 
            ? '0 24px 70px rgba(0, 0, 0, 0.55), 0 0 40px rgba(57, 255, 20, 0.15)'
            : '0 24px 70px rgba(0, 0, 0, 0.55), 0 0 40px rgba(57, 255, 20, 0.08)',
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard };
