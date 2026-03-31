import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DetailHeader } from '@/components/detail/DetailHeader'
import type { StatusVariant } from '@/components/detail/StatusBadge'

type MaxWidth = 'md' | 'lg' | 'xl' | '2xl' | 'full'

const maxWidthClass: Record<MaxWidth, string> = {
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
  full: 'max-w-none',
}

export function DetailPageLayout({
  title,
  subtitle,
  backUrl,
  status,
  actions,
  maxWidth = 'xl',
  children,
  className,
  headerContainerClassName,
  contentClassName,
}: {
  title: string
  subtitle?: string
  backUrl: string
  status?: { label: string; variant: StatusVariant }
  actions?: ReactNode
  maxWidth?: MaxWidth
  children: ReactNode
  className?: string
  headerContainerClassName?: string
  contentClassName?: string
}) {
  return (
    <div className={cn('w-full flex-1 flex flex-col h-full overflow-hidden bg-background', className)}>
      <div
        className={cn(
          'px-4 sm:px-6 py-4 border-b border-border/40 bg-background/95 backdrop-blur z-10 shrink-0',
          headerContainerClassName
        )}
      >
        <DetailHeader
          title={title}
          subtitle={subtitle}
          backUrl={backUrl}
          status={status}
          actions={actions}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className={cn('w-full mx-auto space-y-8', maxWidthClass[maxWidth], contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
