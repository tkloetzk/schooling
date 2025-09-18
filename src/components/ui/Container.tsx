import React from "react";
import { cn } from "../../utils/cn";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  center?: boolean;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, children, size = "lg", center = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base container styles
          "w-full mx-auto px-4 sm:px-6 lg:px-8",

          // Size variants
          {
            "max-w-screen-sm": size === "sm",
            "max-w-screen-md": size === "md",
            "max-w-screen-lg": size === "lg",
            "max-w-screen-xl": size === "xl",
            "max-w-full": size === "full",
          },

          // Center content vertically and horizontally
          {
            "flex items-center justify-center min-h-screen": center,
          },

          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Container.displayName = "Container";

export { Container };
