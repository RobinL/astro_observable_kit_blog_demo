// Registry of all available notebooks
// Add new notebooks here as you create them
import * as HelloWorldDiffDemo from 'hello-world-diff-demo';
import type { NotebookModule } from '../types/observable';

export const notebookRegistry: Record<string, NotebookModule> = {
  'hello-world-diff-demo': HelloWorldDiffDemo as any,
} as const;

export type NotebookKey = keyof typeof notebookRegistry;
