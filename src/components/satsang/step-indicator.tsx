"use client";

import { Upload, Users, CalendarCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep } from "@/lib/types";

interface StepIndicatorProps {
  currentStep: WizardStep;
}

const steps = [
  {
    step: 1 as WizardStep,
    label: "Upload & Extract",
    shortLabel: "Upload",
    icon: Upload,
  },
  {
    step: 2 as WizardStep,
    label: "Configure Pathis",
    shortLabel: "Configure",
    icon: Users,
  },
  {
    step: 3 as WizardStep,
    label: "Generate Schedule",
    shortLabel: "Generate",
    icon: CalendarCheck,
  },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-start justify-between max-w-xl mx-auto">
        {steps.map((s, index) => {
          const isCompleted = currentStep > s.step;
          const isCurrent = currentStep === s.step;

          return (
            <div key={s.step} className="flex items-start flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 w-full">
                {/* Circle */}
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 shrink-0",
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isCurrent
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600"
                      : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-400 dark:text-gray-600"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <s.icon className="h-4 w-4" />
                  )}
                </div>
                {/* Label - hidden on very small screens */}
                <span
                  className={cn(
                    "text-[11px] font-medium text-center leading-tight hidden sm:block",
                    isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isCurrent
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
                {/* Short label for mobile */}
                <span
                  className={cn(
                    "text-[11px] font-medium text-center leading-tight sm:hidden",
                    isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isCurrent
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}
                >
                  {s.shortLabel}
                </span>
              </div>

              {/* Connector line - positioned between circles */}
              {index < steps.length - 1 && (
                <div className="flex items-center pt-[18px] flex-1 px-1">
                  <div
                    className={cn(
                      "w-full h-0.5 transition-all duration-300",
                      currentStep > s.step
                        ? "bg-emerald-500"
                        : "bg-gray-200 dark:bg-gray-800"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
