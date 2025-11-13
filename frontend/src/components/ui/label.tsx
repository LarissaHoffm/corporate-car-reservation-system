import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/auth/utils";

function Label(
  props: React.ComponentProps<typeof LabelPrimitive.Root> & {
    className?: string;
  },
) {
  const { className, ...rest } = props;
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  );
}

export { Label };
