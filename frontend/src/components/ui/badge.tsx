/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
                destructive:
                    "border-transparent bg-destructive/15 text-destructive hover:bg-destructive/25",
                outline: "border-border text-foreground",
                /** Acento de marca (naranja MV) en versión soft */
                brand:
                    "border-transparent bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft/70",
                /** Acento de marca sólido (úsese con moderación) */
                "brand-solid":
                    "border-transparent bg-accent text-accent-foreground hover:bg-accent/90",
                warning:
                    "border-transparent bg-warning/15 text-warning hover:bg-warning/25",
                success:
                    "border-transparent bg-success/15 text-success hover:bg-success/25",
                info:
                    "border-transparent bg-info/15 text-info hover:bg-info/25",
                error:
                    "border-transparent bg-error/15 text-error hover:bg-error/25",
                /** Compatibilidad con código existente */
                role:
                    "border-transparent bg-info/15 text-info dark:bg-info/20",
                orange:
                    "border-transparent bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft/70",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
