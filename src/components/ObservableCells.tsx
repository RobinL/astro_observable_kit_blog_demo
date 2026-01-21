import React, {
    useRef,
    useEffect,
    createContext,
    useContext,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import { notebookRegistry, type NotebookKey } from '../lib/notebookRegistry';

interface RuntimeContextValue {
    runtime: any;
    main: any;
}

const ObservableRuntimeContext = createContext<RuntimeContextValue | null>(null);

interface ObservableProviderProps {
    notebookKey: NotebookKey;
    children: ReactNode;
}

export function ObservableProvider({ notebookKey, children }: ObservableProviderProps) {
    const [runtimeContext, setRuntimeContext] = useState<RuntimeContextValue | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(false);

    useEffect(() => {
        if (mountedRef.current) return;
        mountedRef.current = true;

        let cleanup: (() => void) | undefined;

        const setupNotebook = () => {
            try {
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

                // Create a temporary container for mount
                const tempContainer = document.createElement('div');

                // Use the mount function from the notebook
                const { runtime, main } = mount(tempContainer, {
                    appendUnmatched: false
                });

                setRuntimeContext({ runtime, main });

                cleanup = () => {
                    runtime.dispose();
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
    }, [notebookKey]);

    if (error) {
        return <div style={{ color: 'red', padding: '20px' }}>Error loading notebook: {error}</div>;
    }

    return (
        <ObservableRuntimeContext.Provider value={runtimeContext}>
            {children}
        </ObservableRuntimeContext.Provider>
    );
}

interface ObservableCellProps {
    cellName: string;
    styles?: React.CSSProperties;
    className?: string;
}

export function ObservableCell({ cellName, styles, className }: ObservableCellProps) {
    const ref = useRef<HTMLDivElement>(null);
    const context = useContext(ObservableRuntimeContext);

    useEffect(() => {
        if (!context || !ref.current) return;

        const { runtime, main } = context;

        // Find the cell by name and attach an inspector
        const { Inspector } = runtime.constructor;
        const variable = main.variable(new Inspector(ref.current));

        // Redefine the variable to observe the named cell
        variable.define([cellName], (value: any) => value);

        return () => {
            // Variable cleanup is handled by runtime.dispose()
        };
    }, [context, cellName]);

    return <div ref={ref} style={styles} className={className} data-cell={cellName} />;
}

interface WithObservableProviderProps {
    notebookKey: NotebookKey;
    children: ReactNode;
}

export function WithObservableProvider({ notebookKey, children }: WithObservableProviderProps) {
    return (
        <ObservableProvider notebookKey={notebookKey}>{children}</ObservableProvider>
    );
}
