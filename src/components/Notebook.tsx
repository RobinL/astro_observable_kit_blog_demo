import React, { useEffect, useRef } from 'react';

interface NotebookModule {
  default: any;
  Runtime: any;
  Inspector: any;
  createLibrary: () => any;
}

interface Props {
  notebook: NotebookModule;
  targets?: Record<string, string>; // Map Observable Names -> DOM IDs
}

export default function Notebook({ notebook, targets }: Props) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    // 1. Setup Runtime
    const runtime = new notebook.Runtime(notebook.createLibrary());

    // 2. Define Module
    runtime.module(notebook.default, (name: string) => {
      // If we have a specific target mapping for this cell...
      if (targets && targets[name]) {
        const targetId = targets[name];
        const el = document.getElementById(targetId);
        if (el) return new notebook.Inspector(el);
      }

      return true; // Run calculation but don't display
    });

    return () => runtime.dispose();
  }, [notebook, targets]);

  return null; // This component manages DOM portals, it doesn't render itself
}
