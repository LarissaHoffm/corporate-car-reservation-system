import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

type Props = ToasterProps & { theme?: ToasterProps["theme"] };

const Toaster = ({ theme = "system", ...props }: Props) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
