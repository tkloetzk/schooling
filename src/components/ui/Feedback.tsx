import React from "react";
import { cn } from "../../utils/cn";

export type FeedbackVariant = "success" | "error" | "info" | "warning";

interface FeedbackAction {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

export interface FeedbackProps {
  variant: FeedbackVariant;
  message: React.ReactNode;
  className?: string;
  action?: FeedbackAction;
  persist?: boolean; // if true, aria-live polite; else assertive
  role?: "status" | "alert";
  testId?: string;
  size?: "sm" | "lg"; // lg replicates earlier jumbo styling
}

const variantStyles: Record<FeedbackVariant, string> = {
  success:
    "feedback-box-success bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-600 text-emerald-700",
  error:
    "feedback-box-error bg-gradient-to-br from-rose-100 to-rose-200 border-rose-600 text-rose-700",
  info: "feedback-box-info bg-gradient-to-br from-sky-100 to-sky-200 border-sky-600 text-sky-700",
  warning:
    "feedback-box-warning bg-gradient-to-br from-amber-100 to-amber-200 border-amber-600 text-amber-800",
};

const sizeStyles: Record<NonNullable<FeedbackProps['size']>, string> = {
  sm: "text-lg px-4 py-3",
  lg: "text-2xl px-6 py-5",
};

export const Feedback: React.FC<FeedbackProps> = ({
  variant,
  message,
  className,
  action,
  persist = true,
  role,
  testId,
  size = "lg",
}) => {
  const ariaRole = role || (variant === "error" ? "alert" : "status");
  return (
    <div
      data-testid={testId}
      role={ariaRole}
      aria-live={persist ? "polite" : "assertive"}
      className={cn(
        "feedback-component rounded-2xl font-bold shadow-md flex flex-col items-center gap-4",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      <div className="feedback-message w-full text-center leading-snug">
        {message}
      </div>
      {action && (
        <button
          type="button"
          className={cn(
            "feedback-action mt-2 px-5 py-3 text-xl font-semibold rounded-xl transition focus:outline-none focus-visible:ring-4 focus-visible:ring-black/30",
            action.disabled
              ? "opacity-60 cursor-not-allowed"
              : "bg-white/80 hover:bg-white text-gray-900 border border-gray-300"
          )}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default Feedback;
