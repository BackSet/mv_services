/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 ease-claude focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                // Acción principal: negro sólido (marca MV)
                default:
                    "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 active:scale-[0.98]",
                // CTA de marca: naranja MV (úsese con moderación)
                accent:
                    "bg-accent text-accent-foreground shadow-soft hover:bg-accent/90 active:scale-[0.98]",
                // Acción destructiva
                destructive:
                    "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
                // Outline cálido sobre fondo cream
                outline:
                    "border border-border bg-background hover:bg-muted hover:border-foreground/20 text-foreground",
                // Secundario neutro
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                // Soft brand: fondo naranja muy diluido + texto naranja oscuro
                soft:
                    "bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft/70",
                // Ghost transparente, hover con tinte muy suave
                ghost:
                    "text-foreground hover:bg-muted hover:text-foreground",
                // Link: texto naranja MV con underline en hover
                link: "text-accent underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3 text-[13px]",
                lg: "h-11 rounded-lg px-6",
                xl: "h-12 rounded-lg px-8 text-[15px]",
                icon: "h-10 w-10",
                "icon-sm": "h-8 w-8",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    /** Muestra spinner y deshabilita el botón mientras dura la acción. */
    loading?: boolean
    /** Texto opcional mostrado mientras `loading` es true. */
    loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant,
            size,
            asChild = false,
            loading = false,
            loadingText,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        // Cuando se usa como Slot, ignoramos las decoraciones de loading
        // (children debe ser un único elemento, no podemos inyectar el spinner).
        if (asChild) {
            return (
                <Slot
                    className={cn(buttonVariants({ variant, size, className }))}
                    ref={ref as React.Ref<HTMLElement>}
                    {...props}
                >
                    {children}
                </Slot>
            )
        }

        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || loading}
                aria-busy={loading || undefined}
                {...props}
            >
                {loading && (
                    <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                    />
                )}
                {loading && loadingText ? loadingText : children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
