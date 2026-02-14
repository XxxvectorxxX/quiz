"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  children,
  variant,
  size,
}: {
  text: string;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "secondary" | "ghost" | "outline" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
      }}
    >
      {children}
    </Button>
  );
}
