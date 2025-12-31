"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  question: string;
  answer: string;
}

export function AccordionItem({ question, answer }: AccordionItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left font-medium hover:bg-secondary/50 transition-colors"
      >
        <span>{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-96" : "max-h-0"
        )}
      >
        <p className="px-5 pb-5 text-muted-foreground leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
}

export function Accordion({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}
