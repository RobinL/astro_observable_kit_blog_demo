import { Runtime as ObservableRuntime } from "@observablehq/runtime";
import { Inspector } from "@observablehq/inspector";
import { Library } from "@observablehq/stdlib";
import * as Inputs from "@observablehq/inputs";
import define, { cells } from "./define.js";

export { Inspector, Library, Inputs };

export function createLibrary() {
  const library = new Library();
  // notebook-kit HTML exports assume Inputs is globally available; we provide it via the library.
  return Object.assign(library, { Inputs });
}

// Export a Runtime class that comes pre-wired with stdlib + Inputs so consumers can do:
//   new Runtime().module(define, Inspector.into(...))
export class Runtime extends ObservableRuntime {
  constructor(builtins = createLibrary()) {
    super(builtins);
  }
}

/**
 * Mount the notebook into a container with optional cell targeting.
 *
 * @param {Element} [container=document.body] - Default container for unmatched cells
 * @param {Object} [options]
 * @param {Record<string, Element>} [options.targets] - Map of cell name -> target element
 * @param {boolean} [options.appendUnmatched=true] - Whether to append unmatched cells to the container
 * @returns {{ runtime: Runtime, main: Module }} - The runtime and main module for cleanup
 */
export function mount(container = document.body, options = {}) {
  const { targets = {}, appendUnmatched = true } = options;

  // Build a lookup: cell name -> set of observable variable names that belong to it
  // For view cells: the primary display is "viewof <name>", we suppress "<name>" to avoid duplicates
  const cellNameToOutputs = new Map();
  const suppressedOutputs = new Set();

  for (const cell of cells) {
    const primaryOutputs = [];
    for (const output of cell.outputs) {
      if (output.startsWith("viewof ")) {
        primaryOutputs.push(output);
        // Suppress the derived value variable (e.g. "one" when we have "viewof one")
        suppressedOutputs.add(output.slice("viewof ".length));
      } else {
        primaryOutputs.push(output);
      }
    }
    // Anonymous cells (no outputs) still need to render
    if (primaryOutputs.length === 0) {
      primaryOutputs.push(null); // marker for anonymous cell
    }
    for (const name of cell.names) {
      cellNameToOutputs.set(name, { outputs: primaryOutputs, cell });
    }
  }

  // Helper: find target element for a cell
  function findTarget(cell) {
    // 1. Try targets map
    for (const name of cell.names) {
      if (targets[name]) return targets[name];
    }
    // 2. Try data-cell attribute in document
    for (const name of cell.names) {
      const escaped = CSS.escape(name);
      const el = document.querySelector(`[data-cell="${escaped}"]`);
      if (el) return el;
    }
    return null;
  }

  // Map output variable name -> target element
  const outputToTarget = new Map();
  const unmatchedContainer = container;

  for (const cell of cells) {
    const target = findTarget(cell);
    if (target) {
      // All outputs of this cell go to this target
      for (const output of cell.outputs) {
        outputToTarget.set(output, target);
      }
      // Also handle anonymous cells
      if (cell.outputs.length === 0) {
        outputToTarget.set(`__anon_${cell.index}`, target);
      }
    }
  }

  const runtime = new Runtime();

  // Track anonymous cell counter for matching
  let anonIndex = 0;
  const cellIndexToAnonKey = new Map();
  for (const cell of cells) {
    if (cell.outputs.length === 0) {
      cellIndexToAnonKey.set(cell.index, `__anon_${cell.index}`);
    }
  }

  const main = runtime.module(define, (name) => {
    // Suppress derived value outputs for view cells
    if (suppressedOutputs.has(name)) {
      return true; // Don't render
    }

    // Check if this output has a specific target
    if (outputToTarget.has(name)) {
      return new Inspector(outputToTarget.get(name));
    }

    // Handle anonymous cells (name is undefined)
    if (name === undefined) {
      // Find the next anonymous cell
      for (const [idx, key] of cellIndexToAnonKey) {
        if (outputToTarget.has(key)) {
          cellIndexToAnonKey.delete(idx);
          return new Inspector(outputToTarget.get(key));
        }
        cellIndexToAnonKey.delete(idx);
        break;
      }
    }

    // Fallback: append to container if allowed
    if (appendUnmatched) {
      const div = document.createElement("div");
      div.className = "observablehq-cell";
      unmatchedContainer.appendChild(div);
      return new Inspector(div);
    }

    return true; // Don't render
  });

  return { runtime, main };
}