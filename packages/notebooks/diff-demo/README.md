# hello-world-diff-demo

This library was generated from an Observable Notebook.

## Usage

```javascript
import { mount } from "hello-world-diff-demo";

// Renders one root per cell (notebook-kit semantics), supporting display() and view().
const { runtime } = mount(document.getElementById("notebook") ?? document.body);

// Later, when done:
// runtime.dispose();
```

## Layout / Directing Output

This package uses notebook-kit style placement:

- Each cell renders into a DOM element with id `cell-<id>` (e.g. `cell-4`).
- If a matching element already exists anywhere in the document, `mount()` will render into it.
- Otherwise `mount(container)` will create the missing cell roots and append them to `container`.

Example:

```html
<div id="notebook">
  <div id="cell-1"></div>
  <div id="cell-2"></div>
  <div id="cell-3"></div>
  <div id="cell-4"></div>
</div>
```

## display()

Cells can call `display(value)` to imperatively append output into the current cell’s root.
Multiple `display(...)` calls append multiple outputs, matching notebook-kit behavior.

