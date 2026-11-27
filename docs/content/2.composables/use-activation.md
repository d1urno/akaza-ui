---
title: useActivation
description: Apply the fork's activation policy to consumer-owned controls.
---

Built-in Akaza controls read `AkazaConfigProvider` automatically. For native buttons
you supply through slots, call `useActivation()` in a component below the provider.
Without a provider, activation remains on click.

```vue
<script setup lang="ts">
import { Popover, useActivation } from "akaza-ui";
const activation = useActivation();
</script>

<template>
  <Popover>
    <template #trigger="{ toggle, triggerProps }">
      <button type="button" v-bind="{ ...triggerProps, ...activation.bindings(toggle) }">
        Open
      </button>
    </template>
    <template #content>Popover content</template>
  </Popover>
</template>
```

## API Reference

`useActivation()` returns:

| Member | Purpose |
| --- | --- |
| `bindings(action, disabled?)` | Pointer and click handlers for a consumer-owned control. `disabled` is an optional getter. Do not add a second click handler. |
| `onPointerDown(event, action, disabled?)` | Add early activation alongside an existing click handler. `disabled` is an optional boolean. |

The action receives the original `MouseEvent` or its `PointerEvent` subtype and may
return a value or Promise. The helper does not implement loading state; Akaza Button
continues to implement `loadingAuto`.

Under `activation="mouse-down"`, primary mouse presses run early and their release
click is consumed. Keyboard, assistive-technology, touch and pen clicks remain
available. Native links and submit/reset buttons retain browser click defaults.
Ancestor DOM click listeners do not observe consumed releases; use semantic
component action/change events instead.

The helper preserves focus before running the action and prevents subsequent native
mouse focus movement. Existing actions still own validation and cancellation.
Presses from nested interactive controls are not treated as parent activation.

For configuration and subtree overrides, see [AkazaConfigProvider](/components/config-provider).
