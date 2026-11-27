import type { Component } from "vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, Teleport } from "vue";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { AkazaConfigProvider } from "@/components/config-provider";
import { DataTable } from "@/components/data-table";
import { NumberField } from "@/components/number-field";
import { Select } from "@/components/select";
import { activationKey, useActivation } from "@/composables/activation";
import { Accordion, Calendar, Collapsible, Listbox, MonthPicker, Pagination, RadioGroup, Rating, Stepper, TagsInput, ToggleGroup, Toolbar, Tree, YearPicker } from "@/index";

enableAutoUnmount(afterEach);

function pointer(target: EventTarget, type = "pointerdown", options: Record<string, unknown> = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...options });
  Object.assign(event, {
    pointerType: options.pointerType ?? "mouse",
    pointerId: options.pointerId ?? 1,
    isPrimary: options.isPrimary ?? true,
  });
  target.dispatchEvent(event);
  return event;
}

function release(target: EventTarget) {
  pointer(target, "pointerup");
  return pointer(target, "click", { detail: 1 });
}

afterEach(() => pointer(document, "pointercancel"));

const pressConfig = () => ({ provide: { [activationKey as symbol]: ref("mouse-down") } });

describe("activation policy", () => {
  const options = [{ value: "one", label: "One" }, { value: "two", label: "Two" }];
  const cases = [
    { name: "Accordion", component: Accordion, props: { items: options }, selector: ".akaza-accordion-trigger", event: "update:modelValue" },
    { name: "Collapsible", component: Collapsible, props: {}, selector: ".akaza-collapsible-trigger", event: "update:modelValue" },
    { name: "Listbox", component: Listbox, props: { options }, selector: '[role="option"]', event: "value-change" },
    { name: "RadioGroup", component: RadioGroup, props: { options }, selector: '[role="radio"]', event: "value-change" },
    { name: "ToggleGroup", component: ToggleGroup, props: { options }, selector: ".akaza-toggle-group-item", event: "value-change" },
    { name: "Rating", component: Rating, props: {}, selector: ".akaza-rating-radio", event: "value-change" },
    { name: "Stepper", component: Stepper, props: { items: [{ value: 1, title: "First" }, { value: 2, title: "Second" }], modelValue: 1, showControls: true }, selector: ".akaza-stepper-next", event: "value-change" },
    { name: "Pagination", component: Pagination, props: { total: 100, pageSize: 10 }, selector: ".akaza-pagination-next", event: "value-change" },
    { name: "Calendar", component: Calendar, props: {}, selector: ".akaza-calendar-cell-trigger:not(:disabled)", event: "value-change" },
    { name: "MonthPicker", component: MonthPicker, props: {}, selector: '[role="gridcell"] button:not(:disabled)', event: "value-change" },
    { name: "YearPicker", component: YearPicker, props: {}, selector: '[role="gridcell"] button:not(:disabled)', event: "value-change" },
    { name: "TagsInput", component: TagsInput, props: { modelValue: ["one"] }, selector: ".akaza-tags-input-delete", event: "value-change" },
    { name: "Toolbar", component: Toolbar, props: { items: options }, selector: ".akaza-toolbar-button", event: "select" },
    { name: "Tree", component: Tree, props: { items: [{ id: "root", label: "Root", children: [{ id: "child", label: "Child" }] }], itemKey: "id" }, selector: ".akaza-tree-toggle", event: "update:expanded" },
  ];

  it.each(cases)("$name reuses its action on press exactly once", ({ component, props, selector, event }) => {
    const wrapper = mount(component as Component, { attachTo: document.body, global: pressConfig(), props });
    const control = wrapper.get(selector);
    pointer(control.element);
    expect(wrapper.emitted(event)).toHaveLength(1);
    release(control.element);
    expect(wrapper.emitted(event)).toHaveLength(1);
  });

  it("defaults to click and preserves native event forwarding", async () => {
    const action = vi.fn();
    const wrapper = mount(Button, { attachTo: document.body, attrs: { onClick: action } });
    pointer(wrapper.element);
    expect(action).not.toHaveBeenCalled();
    release(wrapper.element);
    expect(action).toHaveBeenCalledOnce();
  });

  it("runs once on press and preserves keyboard/programmatic clicks", async () => {
    const action = vi.fn();
    const wrapper = mount(Button, { attachTo: document.body, global: pressConfig(), attrs: { onClick: action } });
    pointer(wrapper.element);
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0]![0].type).toBe("pointerdown");
    expect(document.activeElement).toBe(wrapper.element);
    expect(release(wrapper.element).defaultPrevented).toBe(true);
    expect(action).toHaveBeenCalledOnce();
    (wrapper.element as HTMLElement).click();
    expect(action).toHaveBeenCalledTimes(2);
  });

  it.each(["touch", "pen"])("keeps %s activation on release", (pointerType) => {
    const action = vi.fn();
    const wrapper = mount(Button, { attachTo: document.body, global: pressConfig(), attrs: { onClick: action } });
    pointer(wrapper.element, "pointerdown", { pointerType });
    expect(action).not.toHaveBeenCalled();
    release(wrapper.element);
    expect(action).toHaveBeenCalledOnce();
  });

  it.each([{ button: 1 }, { button: 2 }, { isPrimary: false }])("ignores non-primary presses: %j", (options) => {
    const action = vi.fn();
    const wrapper = mount(Button, { global: pressConfig(), attrs: { onClick: action } });
    pointer(wrapper.element, "pointerdown", options);
    expect(action).not.toHaveBeenCalled();
  });

  it.each([{ disabled: true }, { disabled: true, focusableWhenDisabled: true }, { loading: true }])("respects disabled/loading state: %j", (props) => {
    const action = vi.fn();
    const wrapper = mount(Button, { global: pressConfig(), props, attrs: { onClick: action } });
    pointer(wrapper.element);
    expect(action).not.toHaveBeenCalled();
  });

  it.each([{ type: "submit" as const }, { type: "reset" as const }, { as: "a", href: "/destination" }])("retains native form/link activation: %j", (props) => {
    const action = vi.fn((event: Event) => event.preventDefault());
    const wrapper = mount(Button, { attachTo: document.body, global: pressConfig(), props, attrs: { onClick: action } });
    pointer(wrapper.element);
    expect(action).not.toHaveBeenCalled();
    release(wrapper.element);
    expect(action).toHaveBeenCalledOnce();
  });

  it("tracks async loading when an action starts on press", async () => {
    let resolve!: () => void;
    const action = vi.fn(() => new Promise<void>(done => { resolve = done; }));
    const wrapper = mount(Button, { attachTo: document.body, global: pressConfig(), props: { loadingAuto: true }, attrs: { onClick: action } });
    pointer(wrapper.element);
    await nextTick();
    expect(wrapper.attributes("aria-busy")).toBe("true");
    pointer(wrapper.element);
    expect(action).toHaveBeenCalledOnce();
    resolve();
    await flushPromises();
    expect(wrapper.attributes("aria-busy")).toBeUndefined();
  });

  it("preserves native once listeners across mouse and keyboard clicks", () => {
    const action = vi.fn();
    const wrapper = mount(Button, { attachTo: document.body, global: pressConfig(), attrs: { onClickOnce: action } });
    pointer(wrapper.element);
    expect(action).not.toHaveBeenCalled();
    release(wrapper.element);
    expect(action).toHaveBeenCalledOnce();
    (wrapper.element as HTMLElement).click();
    expect(action).toHaveBeenCalledOnce();
  });

  it("does not suppress keyboard clicks while a mouse press is held", () => {
    const action = vi.fn();
    const wrapper = mount(Button, { attachTo: document.body, global: pressConfig(), attrs: { onClick: action } });
    pointer(wrapper.element);
    (wrapper.element as HTMLElement).click();
    expect(action).toHaveBeenCalledTimes(2);
    release(wrapper.element);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("clears suppression on cancellation and a new pointer sequence", () => {
    const action = vi.fn();
    const wrapper = mount(Button, { attachTo: document.body, global: pressConfig(), attrs: { onClick: action } });
    pointer(wrapper.element);
    pointer(document, "pointercancel");
    release(wrapper.element);
    expect(action).toHaveBeenCalledTimes(2);
    pointer(wrapper.element);
    pointer(wrapper.element, "pointerdown", { pointerType: "touch", pointerId: 2 });
    pointer(wrapper.element, "click", { detail: 1, pointerType: "touch", pointerId: 2 });
    expect(action).toHaveBeenCalledTimes(4);
  });

  it("does not leave suppression behind when release produces no click", async () => {
    const action = vi.fn();
    const wrapper = mount(Button, { attachTo: document.body, global: pressConfig(), attrs: { onClick: action } });
    pointer(wrapper.element);
    pointer(document, "pointerup");
    await new Promise(resolve => setTimeout(resolve, 5));
    release(wrapper.element);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("consumes a retargeted release after the pressed component unmounts", async () => {
    const ancestor = vi.fn();
    const visible = ref(true);
    const wrapper = mount(defineComponent({
      setup: () => () => h("div", { onClick: ancestor }, [visible.value ? h(Button, { onClick: () => { visible.value = false; } }, () => "Remove") : null]),
    }), { attachTo: document.body, global: pressConfig() });
    pointer(wrapper.get("button").element);
    await nextTick();
    expect(wrapper.find("button").exists()).toBe(false);
    release(wrapper.element);
    expect(ancestor).not.toHaveBeenCalled();
  });

  it("supports reactive nested providers, Teleport, and app isolation", async () => {
    const action = vi.fn();
    const mode = ref<"click" | "mouse-down">("mouse-down");
    const wrapper = mount(defineComponent({
      setup: () => () => h(AkazaConfigProvider, { activation: mode.value }, {
        default: () => [
          h(Button, { id: "early", onClick: action }),
          h(AkazaConfigProvider, { activation: "click" }, () => h(Button, { id: "late", onClick: action })),
          h(Teleport, { to: "body" }, h(Button, { id: "teleported", onClick: action })),
        ],
      }),
    }), { attachTo: document.body });
    pointer(wrapper.get("#early").element);
    release(wrapper.get("#early").element);
    pointer(wrapper.get("#late").element);
    expect(action).toHaveBeenCalledTimes(1);
    pointer(document.querySelector("#teleported")!);
    expect(action).toHaveBeenCalledTimes(2);
    mode.value = "click";
    await nextTick();
    pointer(wrapper.get("#early").element);
    expect(action).toHaveBeenCalledTimes(2);
    const other = mount(Button, { attrs: { onClick: action } });
    pointer(other.element);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("allows consumer triggers and respects a prevented press", () => {
    const action = vi.fn();
    const Child = defineComponent({
      setup() {
        const activation = useActivation();
        return () => h("button", { type: "button", ...activation.bindings(action) }, "Open");
      },
    });
    const wrapper = mount(Child, { attachTo: document.body, global: pressConfig() });
    wrapper.element.addEventListener("pointerdown", event => event.preventDefault(), { once: true, capture: true });
    pointer(wrapper.element);
    expect(action).not.toHaveBeenCalled();
    pointer(wrapper.element);
    expect(action).toHaveBeenCalledOnce();
    release(wrapper.element);
    expect(action).toHaveBeenCalledOnce();
  });

  it("retains cancellation semantics and commits number changes once", async () => {
    const checkbox = mount(Checkbox, {
      attachTo: document.body, global: pressConfig(),
      props: { "onValue-change": (_value, details) => details.cancel() },
    });
    pointer(checkbox.get("button").element);
    release(checkbox.get("button").element);
    expect(checkbox.emitted("value-change")).toHaveLength(1);
    expect(checkbox.emitted("update:modelValue")).toBeUndefined();
    const number = mount(NumberField, { attachTo: document.body, global: pressConfig(), props: { modelValue: 2 } });
    pointer(number.get(".akaza-number-field-increment").element);
    release(number.get(".akaza-number-field-increment").element);
    expect(number.emitted("value-change")?.[0]?.[0]).toBe(3);
    expect(number.emitted("value-commit")).toHaveLength(1);
  });

  it("opens Select and selects an option on press without toggling twice", async () => {
    const wrapper = mount(Select, {
      attachTo: document.body, global: pressConfig(),
      props: { multiple: true, options: [{ label: "Vue", value: "vue" }], ariaLabel: "Framework" },
    });
    pointer(wrapper.get("button").element);
    await flushPromises();
    release(wrapper.get("button").element);
    const option = wrapper.get('[role="option"]');
    pointer(option.element);
    release(option.element);
    expect(wrapper.emitted("value-change")).toHaveLength(1);
    expect(wrapper.emitted("value-change")?.[0]?.[0]).toEqual(["vue"]);
  });

  it.each(["wrapped", "for"])("preserves native %s label activation inside table cells", (association) => {
    const inputId = `native-${association}`;
    const wrapper = mount(DataTable<{ id: number; name: string }>, {
      attachTo: document.body, global: pressConfig(),
      props: { data: [{ id: 1, name: "Ada" }], columns: [{ accessor: "name" }], rowKey: "id", selectionMode: "multiple", selectionBehavior: "row" },
      slots: { cell: () => {
        const input = h("input", { id: inputId, type: "checkbox" });
        const text = h("span", "Toggle native checkbox");
        return association === "wrapped" ? h("label", [input, text]) : [input, h("label", { for: inputId }, text)];
      } },
    });
    const target = wrapper.get("label span").element;
    const input = wrapper.get("input[type=checkbox][id]").element as HTMLInputElement;
    for (const checked of [true, false]) {
      expect(pointer(target).defaultPrevented).toBe(false);
      expect(input.checked).toBe(!checked);
      expect(release(target).defaultPrevented).toBe(false);
      expect(input.checked).toBe(checked);
    }
    expect(wrapper.emitted("selection-change")).toBeUndefined();
  });

  it("preserves table cell and row actions, excluding nested controls", () => {
    const wrapper = mount(DataTable<{ id: number; name: string }>, {
      attachTo: document.body, global: pressConfig(),
      props: { data: [{ id: 1, name: "Ada" }], columns: [{ accessor: "name" }], rowKey: "id", selectionMode: "multiple", selectionBehavior: "row" },
    });
    const cell = wrapper.get("tbody td");
    pointer(cell.element);
    release(cell.element);
    expect(wrapper.emitted("cell-click")).toHaveLength(1);
    expect(wrapper.emitted("row-click")).toHaveLength(1);
    expect(wrapper.emitted("selection-change")?.[0]?.[0]).toEqual([1]);
  });
});
