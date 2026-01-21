// Registry of all available notebooks
// Add new notebooks here as you create them
import * as HelloWorldDiffDemo from 'hello-world-diff-demo';
import * as MatchWeightCalculator from 'match-weight-calculator';
import type { NotebookModule } from '../types/observable';

export const notebookRegistry: Record<string, NotebookModule> = {
  'hello-world-diff-demo': HelloWorldDiffDemo as any,
  'match-weight-calculator': MatchWeightCalculator as any,
} as const;

export type NotebookKey = keyof typeof notebookRegistry;
