// Registry of all available notebooks
// Add new notebooks here as you create them
import * as HelloWorldDiffDemo from 'hello-world-diff-demo';

export const notebookRegistry = {
  'hello-world-diff-demo': HelloWorldDiffDemo,
} as const;

export type NotebookKey = keyof typeof notebookRegistry;
