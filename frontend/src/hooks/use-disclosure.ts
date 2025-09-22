import * as React from "react";

export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = React.useState(initial);
  const onOpen = React.useCallback(() => setIsOpen(true), []);
  const onClose = React.useCallback(() => setIsOpen(false), []);
  const onToggle = React.useCallback(() => setIsOpen((v) => !v), []);
  return { isOpen, onOpen, onClose, onToggle, setIsOpen } as const;
}
