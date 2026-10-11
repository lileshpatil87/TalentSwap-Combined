import * as React from "react";
import { cn } from "@/lib/utils";
export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div role="alert" className={cn("rounded-lg border border-border bg-muted/40 p-4 text-sm", className)} {...props} />; }
