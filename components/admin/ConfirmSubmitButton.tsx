"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  confirmText,
  children,
  variant,
  size,
}: {
  confirmText: string;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "secondary" | "ghost" | "outline" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      onClick={(e) => {
        if (!confirm(confirmText)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {children}
    </Button>
  );
}
