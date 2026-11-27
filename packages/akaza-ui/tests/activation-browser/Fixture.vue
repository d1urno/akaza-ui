<script setup lang="ts">
import {
  AkazaConfigProvider, Button, Checkbox, Combobox, DataTable, Dialog, Menu,
  NumberField, Popover, Select, Switch, Tabs, Toggle, useActivation,
} from "akaza-ui";
import { defineComponent, h, ref } from "vue";

const count = ref(0);
const lateCount = ref(0);
const removed = ref(false);
const ancestorCount = ref(0);
const saved = ref(0);
const submitted = ref(0);
const selected = ref<string[]>([]);
const searchValue = ref("");
const checked = ref(false);
const switched = ref(false);
const toggled = ref(false);
const tab = ref("first");
const number = ref(2);
const commits = ref(0);
const menuSelections = ref(0);
const options = [{ label: "Vue", value: "vue" }, { label: "React", value: "react" }];
const menuItems = [{ label: "Run action", onSelect: () => { menuSelections.value++; } }];
const tabs = [{ label: "First", value: "first" }, { label: "Second", value: "second" }];
const ConsumerTrigger = defineComponent({
  props: { toggle: { type: Function, required: true } },
  setup(props) {
    const activation = useActivation();
    return () => h("button", { type: "button", ...activation.bindings(event => props.toggle(event)) }, "Consumer trigger");
  },
});

async function save() {
  saved.value++;
  await new Promise(resolve => setTimeout(resolve, 150));
}
</script>

<template>
  <AkazaConfigProvider activation="mouse-down">
    <main>
      <section>
        <Button @click="count++">Count</Button><output data-testid="count">{{ count }}</output>
        <Button disabled @click="count++">Disabled</Button>
        <Button loading @click="count++">Loading</Button>
        <Button loading-auto @click="save">Save</Button><output data-testid="saved">{{ saved }}</output>
        <AkazaConfigProvider activation="click">
          <Button @click="lateCount++">Release</Button><output data-testid="late">{{ lateCount }}</output>
        </AkazaConfigProvider>
      </section>
      <section data-testid="ancestor" @click="ancestorCount++">
        <Button v-if="!removed" @click="removed = true">Remove on press</Button>
        <span v-else>Removed</span>
      </section>
      <output data-testid="ancestor-count">{{ ancestorCount }}</output>
      <section>
        <Checkbox v-model="checked" label="Checkbox" />
        <Switch v-model="switched" label="Switch" />
        <Toggle v-model="toggled">Toggle</Toggle>
        <NumberField v-model="number" aria-label="Amount" @value-commit="commits++" />
        <output data-testid="commits">{{ commits }}</output>
        <Tabs v-model="tab" :items="tabs" />
      </section>
      <section>
        <Select v-model="selected" :options="options" multiple aria-label="Framework" teleport="body" />
        <output data-testid="selected">{{ selected.join(',') }}</output>
        <Combobox v-model="searchValue" :options="options" aria-label="Search" />
        <Menu :items="menuItems" teleport="body">
          <template #trigger="{ toggle: togglePopup, triggerProps }"><Button v-bind="triggerProps" @click="togglePopup">Open menu</Button></template>
        </Menu>
        <output data-testid="menu-selections">{{ menuSelections }}</output>
        <Popover>
          <template #trigger="{ toggle: togglePopup, triggerProps }"><Button v-bind="triggerProps" @click="togglePopup">Open popover</Button></template>
          <template #content="{ close }"><Button @click="close">Close popover</Button></template>
        </Popover>
        <Popover>
          <template #trigger="{ toggle: togglePopup }"><ConsumerTrigger :toggle="togglePopup" /></template>
          <template #content>Consumer popup</template>
        </Popover>
        <Dialog title="Example dialog">
          <template #trigger="{ open }"><Button @click="open">Open dialog</Button></template>
          <template #body="{ close }"><Button @click="close">Close dialog</Button></template>
        </Dialog>
      </section>
      <section>
        <DataTable :data="[{ id: 1, name: 'Ada' }]" :columns="[{ accessor: 'name', sortable: true }]" row-key="id" selection-mode="multiple" selection-behavior="row" />
      </section>
      <form @submit.prevent="submitted++">
        <input aria-label="Required" required>
        <Button type="submit">Submit</Button>
        <Button as="a" href="#destination">Native link</Button>
        <output data-testid="submitted">{{ submitted }}</output>
      </form>
      <div data-testid="scroll" style="height: 120px; overflow: auto; margin-top: 20px">
        <Button v-for="index in 20" :key="index" style="display: block; height: 45px" @click="count++">Scroll item {{ index }}</Button>
      </div>
    </main>
  </AkazaConfigProvider>
</template>

<style>
section { margin: 16px 0; }
button { padding: 8px; margin: 3px; }
.akaza-select-content, .akaza-menu-content, .akaza-popover-content { background: white; border: 1px solid black; }
[role=option], [role=menuitem] { padding: 12px; }
</style>
