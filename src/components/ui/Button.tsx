import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  [
    // Base styles
    "inline-flex items-center justify-center gap-2",
    "font-semibold text-lg",
    "border-none rounded-xl",
    "cursor-pointer",
    "transition-all duration-150 ease-in-out",
    "select-none",
    "tap-highlight-transparent",

    // Minimum touch target (48x48dp)
    "min-w-12 min-h-12",
    "px-6 py-4",

    // Focus styles
    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2",

    // Disabled styles
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary: ["bg-orange-500 text-white", "shadow-md"],
        secondary: ["bg-teal-500 text-white", "shadow-md"],
        success: ["bg-green-500 text-white", "shadow-md"],
        error: ["bg-red-500 text-white", "shadow-md"],
        warning: ["bg-yellow-500 text-black", "shadow-md"],
        outline: ["border-2 border-orange-500 bg-white text-orange-600"],
        ghost: ["bg-transparent text-gray-700"],
      },
      size: {
        sm: ["text-base min-w-10 min-h-10 px-4 py-3"],
        md: ["text-lg min-w-12 min-h-12 px-6 py-4"],
        lg: ["text-xl min-w-16 min-h-16 px-8 py-6"],
        xl: ["text-2xl min-w-20 min-h-20 px-10 py-8"],
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
