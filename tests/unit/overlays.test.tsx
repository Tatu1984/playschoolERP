/**
 * Run with `npm run check:overlays`.
 *
 * Mounts every overlay (menus, dialogs, sheets) in its OPEN state inside jsdom.
 * Overlay content only mounts when open, so neither `tsc` nor an SSR pass of the
 * pages ever executes it — which is exactly how a crash-on-open shipped to
 * production once (Base UI's Menu.GroupLabel throws outside a Menu.Group).
 * Anything that throws while an overlay is open fails here.
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost:3000/admin/admissions",
  pretendToBeVisual: true,
});

// jsdom's DOMWindow is structurally narrower than lib.dom's Window; this file
// only needs the globals Base UI touches, so assign through an index signature.
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
// Node 22 exposes a getter-only `navigator`; redefine rather than assign.
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true, writable: true });
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle;
g.requestAnimationFrame = (cb: FrameRequestCallback) => dom.window.setTimeout(() => cb(0), 0);
g.cancelAnimationFrame = (id: number) => dom.window.clearTimeout(id);
g.localStorage = dom.window.localStorage;
g.matchMedia = () => ({
  matches: false,
  media: "",
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  onchange: null,
  dispatchEvent: () => false,
});
g.IS_REACT_ACT_ENVIRONMENT = true;
g.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Required *after* the globals above exist: React and Base UI read them at
// module-evaluation time, so top-level ESM imports would run too early.
/* eslint-disable @typescript-eslint/no-require-imports */
const React = require("react") as typeof import("react");
const { act } = React;
const { createRoot } = require("react-dom/client") as typeof import("react-dom/client");
const {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} = require("../../src/components/ui/dropdown-menu") as typeof import("../../src/components/ui/dropdown-menu");
const { RowActions } =
  require("../../src/frontend/components/ui/RowActions") as typeof import("../../src/frontend/components/ui/RowActions");
const { ConfirmDialog, DetailDialog, DetailRow, FormDialog } =
  require("../../src/frontend/components/ui/FormDialog") as typeof import("../../src/frontend/components/ui/FormDialog");
const { CheckboxField, ListField, SelectField, SwitchField, TextField, TextareaField } =
  require("../../src/frontend/components/ui/Field") as typeof import("../../src/frontend/components/ui/Field");
const { Sheet, SheetContent, SheetTitle } =
  require("../../src/components/ui/sheet") as typeof import("../../src/components/ui/sheet");
/* eslint-enable @typescript-eslint/no-require-imports */

let pass = 0;
let fail = 0;

/**
 * @param opts.clickTrigger open the menu by clicking its trigger (proves the real
 *   component opens) rather than relying on `defaultOpen`.
 * @param opts.expect text that must appear once the overlay is mounted.
 */
function mount(
  label: string,
  element: React.ReactElement,
  opts: { clickTrigger?: boolean; expect?: string } = {},
) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const text = args.map(String).join(" ");
    // React reports render-phase throws through console.error before rethrowing.
    if (/Base UI|Cannot read|is not a function|Minified React error/.test(text)) errors.push(text);
  };
  try {
    act(() => {
      root.render(element);
    });

    if (opts.clickTrigger) {
      const trigger = host.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
      if (!trigger) throw new Error("no trigger found to click");
      act(() => {
        trigger.dispatchEvent(new dom.window.MouseEvent("pointerdown", { bubbles: true }));
        trigger.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true }));
        trigger.dispatchEvent(new dom.window.MouseEvent("mouseup", { bubbles: true }));
        trigger.click();
      });
    }

    if (errors.length) throw new Error(errors[0].split("\n")[0]);

    const text = dom.window.document.body.textContent ?? "";
    if (opts.expect && !text.includes(opts.expect)) {
      throw new Error(`overlay never showed "${opts.expect}" (body text: "${text.slice(0, 80)}")`);
    }
    pass++;
    console.log(`  ✓ ${label}`);
  } catch (err) {
    fail++;
    console.log(`  ✗ ${label} — ${err instanceof Error ? err.message.split("\n")[0] : err}`);
  } finally {
    console.error = originalError;
    act(() => root.unmount());
    host.remove();
  }
}

const noop = () => {};

console.log("\nMENUS — mounted open");

// The shape every ⋯ row menu uses: a standalone heading, items and a separator.
mount(
  "Row menu: label + items + separator",
  <DropdownMenu defaultOpen>
    <DropdownMenuTrigger>⋯</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuLabel>Row actions</DropdownMenuLabel>
      <DropdownMenuItem>View</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>,
  { expect: "Row actions" },
);

// The real component, opened the way a user opens it.
mount(
  "RowActions component — opens on click",
  <div>
    <RowActions
      label="Row actions"
      actions={[
        { label: "View profile", onSelect: noop },
        { label: "Edit", onSelect: noop },
        { label: "Move class", separatorBefore: true, onSelect: noop },
        { label: "Delete", destructive: true, onSelect: noop },
      ]}
    />
  </div>,
  { clickTrigger: true, expect: "Move class" },
);

// The Base UI-sanctioned arrangement, for when a real group label is wanted.
mount(
  "DropdownMenuGroupLabel inside a group",
  <DropdownMenu defaultOpen>
    <DropdownMenuTrigger>⋯</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuGroup>
        <DropdownMenuGroupLabel>Grouped</DropdownMenuGroupLabel>
        <DropdownMenuItem>Item</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>,
  { expect: "Grouped" },
);

mount(
  "Checkbox + radio items",
  <DropdownMenu defaultOpen>
    <DropdownMenuTrigger>⋯</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
      <DropdownMenuRadioGroup value="a">
        <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>,
  { expect: "Option A" },
);

console.log("\nDIALOGS — mounted open");

mount(
  "FormDialog with every field type",
  <FormDialog
    open
    onOpenChange={noop}
    title="Enrol a student"
    description="Creates the child plus a guardian"
    onSubmit={() => true}
  >
    <TextField label="First name" value="" onChange={noop} />
    <SelectField
      label="Branch"
      value="br_kathgola"
      onChange={noop}
      options={[{ value: "br_kathgola", label: "Kathgola" }]}
    />
    <TextareaField label="Notes" value="" onChange={noop} />
    <SwitchField label="Visible to parents" checked onChange={noop} />
    <CheckboxField label="Agree" checked={false} onChange={noop} />
    <ListField label="Allergies" values={["Peanuts"]} onChange={noop} />
  </FormDialog>,
  { expect: "Enrol a student" },
);

mount(
  "ConfirmDialog",
  <ConfirmDialog
    open
    onOpenChange={noop}
    title="Delete this student?"
    description="This cannot be undone"
    onConfirm={noop}
  />,
  { expect: "Delete this student?" },
);

mount(
  "DetailDialog with rows",
  <DetailDialog open onOpenChange={noop} title="Aarav Sharma" description="CK2026101">
    <DetailRow label="Status">Active</DetailRow>
    <DetailRow label="Class">Sunshine</DetailRow>
  </DetailDialog>,
  { expect: "Aarav Sharma" },
);

console.log("\nSHEET — mounted open");

mount(
  "Sheet (mobile drawer)",
  <Sheet open onOpenChange={noop}>
    <SheetContent side="left">
      <SheetTitle>Navigation</SheetTitle>
      <p>Sidebar contents</p>
    </SheetContent>
  </Sheet>,
  { expect: "Navigation" },
);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
