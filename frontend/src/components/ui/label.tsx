import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
    "leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    {
        variants: {
            variant: {
                default: "text-sm font-medium text-foreground",
                /** Caption en mayúsculas para metadatos / hints */
                caption:
                    "text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
                /** Caption discreto, ideal para labels de form */
                form: "text-[13px] font-medium text-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

const Label = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
        VariantProps<typeof labelVariants>
>(({ className, variant, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn(labelVariants({ variant }), className)}
        {...props}
    />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label, labelVariants }
