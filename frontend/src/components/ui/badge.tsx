/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",
                warning: "border-transparent bg-amber-500/15 text-amber-500 hover:bg-amber-500/25",
                success: "border-transparent bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25",
                role: "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200",
                orange: "border-transparent bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
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
