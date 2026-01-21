// Type definitions for Observable Runtime
export interface Runtime {
  module(define?: any, observer?: any): Module;
  dispose(): void;
  constructor: {
    Inspector: any;
  };
}

export interface Module {
  variable(observer?: any, options?: any): Variable;
  define(name: string | null, inputs: string[], definition: (...args: any[]) => any): Variable;
  import(name: string, alias: string, module: Module): Variable;
  redefine(name: string, inputs: string[], definition: (...args: any[]) => any): Variable;
}

export interface Variable {
  define(inputs: string[], definition: (...args: any[]) => any): Variable;
  import(name: string, alias: string, from: Module): Variable;
  delete(): void;
}

export interface MountOptions {
  targets?: Record<string, HTMLElement>;
  appendUnmatched?: boolean;
}

export interface MountResult {
  runtime: Runtime;
  main: Module;
}

export interface NotebookModule {
  mount: (container?: HTMLElement, options?: MountOptions) => MountResult;
  Runtime: any;
  Inspector: any;
  Library: any;
  Inputs: any;
}
