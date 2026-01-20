import React, { useEffect, useState } from 'react';

interface Props {
  moduleName: string;
  targets?: Record<string, string>; // Map Observable Names -> DOM IDs
}

export default function Notebook({ moduleName, targets }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const loadAndMount = async () => {
      try {
        // Dynamically import the notebook module on the client side only
        const notebook = await import(/* @vite-ignore */ moduleName);

        console.log('Notebook module loaded:', notebook);
        console.log('Available keys:', Object.keys(notebook));

        // Use the mount function if available
        if (notebook.mount && targets) {
          const targetElements: Record<string, Element> = {};
          for (const [name, id] of Object.entries(targets)) {
            const el = document.getElementById(id);
            if (el) targetElements[name] = el;
          }

          const { runtime, main } = notebook.mount(document.body, {
            targets: targetElements,
            appendUnmatched: false
          });

          cleanup = () => runtime.dispose();
          return;
        }

        // Fallback to manual setup
        if (!notebook.Runtime || !notebook.createLibrary) {
          setError('Missing Runtime or createLibrary in notebook module');
          return;
        }

        const runtime = new notebook.Runtime(notebook.createLibrary());

        runtime.module(notebook.default, (name: string) => {
          if (targets && targets[name]) {
            const targetId = targets[name];
            const el = document.getElementById(targetId);
            if (el) return new notebook.Inspector(el);
          }

          return true; // Run calculation but don't display
        });

        cleanup = () => runtime.dispose();
      } catch (err) {
        console.error('Failed to load notebook:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    loadAndMount();

    return () => {
      if (cleanup) cleanup();
    };
  }, [moduleName, targets]);

  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>Error loading notebook: {error}</div>;
  }

  return null;
}
