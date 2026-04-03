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
    icon: Upload,
  },
  {
    step: 2 as WizardStep,
    label: "Configure Pathis",
    icon: Users,
  },
  {
    step: 3 as WizardStep,
    label: "Generate Schedule",
    icon: CalendarCheck,
  },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full mb-2">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((s, index) => {
          const isCompleted = currentStep > s.step;
          const isCurrent = currentStep === s.step;
          const isUpcoming = currentStep < s.step;

          return (
            <div key={s.step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                {/* Circle */}
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isCurrent
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600"
                      : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-400 dark:text-gray-600"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <s.icon className="h-5 w-5" />
                  )}
                </div>
                {/* Label */}
                <span
                  className={cn(
                    "text-xs font-medium text-center whitespace-nowrap",
                    isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isCurrent
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 sm:mx-3 mt-[-16px] sm:mt-[-20px] transition-all duration-300",
                    currentStep > s.step
                      ? "bg-emerald-500"
                      : "bg-gray-200 dark:bg-gray-800"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
