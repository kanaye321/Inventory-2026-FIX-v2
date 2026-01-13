import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 border-0 dark:bg-blue-500 dark:hover:bg-blue-400",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 border-0 dark:bg-red-500 dark:hover:bg-red-400",
        outline:
          "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:border-gray-600",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-0 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 shadow-none hover:shadow-sm",
        link: "text-blue-600 underline-offset-4 hover:underline border-0 shadow-none hover:shadow-none dark:text-blue-400",
        success: "bg-green-600 text-white hover:bg-green-700 border-0 dark:bg-green-500 dark:hover:bg-green-400",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 border-0 dark:bg-yellow-600 dark:hover:bg-yellow-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
