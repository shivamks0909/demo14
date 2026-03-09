import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    size?: 'default' | 'sm' | 'lg' | 'xl'
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, size, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white",
                    size === 'xl' ? "h-14 px-10 text-lg" : "h-9 px-4 py-2",
                    className
                )}
                {...props}
            />
        )
    }
)
LiquidButton.displayName = "LiquidButton"
