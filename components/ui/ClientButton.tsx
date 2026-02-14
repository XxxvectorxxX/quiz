"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button>;

export function ClientButton(props: Props) {
  return <Button {...props} />;
}
