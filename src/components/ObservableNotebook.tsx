import React, { useRef, useEffect, useState } from 'react';
import type { Runtime } from '../types/observable';
import { notebookRegistry, type NotebookKey } from '../lib/notebookRegistry';

interface ObservableNotebookProps {
    notebookKey: NotebookKey;
    cells: string[];
    customClassName?: string;
}

function ObservableNotebook({ notebookKey, cells, customClassName }: ObservableNotebookProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cleanup: (() => void) | undefined;

        const setupNotebook = () => {
            try {
                if (!containerRef.current) {
                    throw new Error('Container ref not available');
                }

                // Get the notebook module from the registry
                const notebook = notebookRegistry[notebookKey];
                if (!notebook) {
                    throw new Error(`Notebook '${notebookKey}' not found in registry`);
                }

                console.log('Notebook object:', notebook);
                console.log('Notebook keys:', Object.keys(notebook));

                // Extract mount function - it's a named export
                const { mount } = notebook;
                if (!mount) {
                    throw new Error('mount function not found in notebook module');
                }

                // Create target elements for each cell
                const targets: Record<string, HTMLElement> = {};
                const cellDivs: HTMLDivElement[] = [];

                cells.forEach((cellName) => {
                    const div = document.createElement('div');
                    div.className = 'observable-cell';
                    containerRef.current!.appendChild(div);
                    cellDivs.push(div);
                    targets[cellName] = div;
                });

                // Use the mount function from the notebook
                const { runtime } = mount(containerRef.current, {
                    targets,
                    appendUnmatched: false
                }) as { runtime: Runtime };

                cleanup = () => {
                    runtime.dispose();
                    // Clean up DOM elements
                    cellDivs.forEach(div => div.remove());
                };
            } catch (err) {
                console.error('Failed to setup notebook:', err);
                setError(err instanceof Error ? err.message : String(err));
            }
        };

        setupNotebook();

        return () => {
            if (cleanup) cleanup();
        };
    }, [notebookKey, cells]);

    if (error) {
        return <div style={{ color: 'red', padding: '20px' }}>Error loading notebook: {error}</div>;
    }

    return <div ref={containerRef} className={customClassName}></div>;
}

export default ObservableNotebook;
