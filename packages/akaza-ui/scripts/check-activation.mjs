import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parse } from "vue/compiler-sfc";

const root = new URL("../src/components/", import.meta.url);
// These clicks are native navigation, focus, or dismissal rather than discrete
// actions. Review additions here whenever upstream introduces a new click handler.
const exceptions = new Set([
  "app-layout/AppLayout.vue:focusMain",
  "combobox/Combobox.vue:onClick",
  "data-table/DataTable.vue:", // Drag handle stops click bubbling; pointerdown starts drag.
  "hover-preview-card/HoverPreviewCard.vue:onTriggerClick",
  "sidebar/Sidebar.vue:onMobileContentClick",
  "tags-input/TagsInput.vue:onRootClick",
]);
const seen = new Set();
const failures = [];
let covered = 0;

async function inspect(directory, prefix = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = `${prefix}${entry.name}`;
    const url = new URL(entry.name, directory);
    if (entry.isDirectory()) {
      await inspect(new URL(`${entry.name}/`, directory), `${name}/`);
    } else if (entry.name.endsWith(".vue")) {
      const { descriptor, errors } = parse(await readFile(url, "utf8"), { filename: fileURLToPath(url) });
      if (errors.length) throw new Error(`${name}: ${errors.join(", ")}`);
      visit(descriptor.template?.ast, name);
    }
  }
}

function visit(node, file) {
  if (!node) return;
  const events = (node.props ?? []).filter(prop => prop.type === 7 && prop.name === "on");
  for (const click of events.filter(prop => prop.arg?.content === "click")) {
    const key = `${file}:${click.exp?.content ?? ""}`;
    if (exceptions.has(key)) {
      seen.add(key);
    } else if (events.some(prop => prop.arg?.content === "pointerdown" && /activation\.onPointerDown|handlePress/.test(prop.exp?.content ?? ""))) {
      covered++;
    } else {
      failures.push(`${file}:${click.loc.start.line}: review activation for ${click.exp?.content ?? "@click"}`);
    }
  }
  for (const child of node.children ?? []) visit(child, file);
}

await inspect(root);
for (const exception of exceptions) {
  if (!seen.has(exception)) failures.push(`Remove or review stale exception: ${exception}`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Activation audit: ${covered} click bindings covered; ${seen.size} explicit exceptions reviewed.`);
}
