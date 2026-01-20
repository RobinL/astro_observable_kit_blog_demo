import React, { useEffect, useState } from 'react';

interface Props {
  moduleName: string;
  containerId?: string;
}

export default function Notebook({ moduleName, containerId }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const loadAndMount = async () => {
      try {
        // Dynamically import the notebook module on the client side only
        const notebook = await import(/* @vite-ignore */ moduleName);

        console.log('Notebook module loaded:', notebook);
        console.log('Available keys:', Object.keys(notebook));

        // Prefer mount() (canonical per-cell notebook-kit semantics)
        if (notebook.mount) {
          const container = (containerId && document.getElementById(containerId)) || document.body;
          const { runtime } = notebook.mount(container);
          cleanup = () => runtime.dispose();
          return;
        }

        // Fallback to manual setup
        if (!notebook.Runtime || !notebook.createLibrary) {
          setError('Missing Runtime or createLibrary in notebook module');
          return;
        }

        const runtime = new notebook.Runtime(notebook.createLibrary());

        runtime.module(notebook.default, () => true); // Run calculation but don't display

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
  }, [moduleName, containerId]);

  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>Error loading notebook: {error}</div>;
  }

  return null;
}
