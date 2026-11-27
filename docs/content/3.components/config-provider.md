---
title: AkazaConfigProvider
description: Configure the fork's optional mouse-down activation behavior.
---

The provider adds no DOM. Its reactive policy applies to descendant Akaza controls,
including teleported content, without process-global configuration.

```vue
<script setup lang="ts">
import { AkazaConfigProvider, Button } from "akaza-ui";
</script>

<template>
  <AkazaConfigProvider activation="mouse-down">
    <Button>Activate on mouse press</Button>
    <AkazaConfigProvider activation="click">
      <Button>Activate on release</Button>
    </AkazaConfigProvider>
  </AkazaConfigProvider>
</template>
```

## API Reference

| Prop | Type | Default |
| --- | --- | --- |
| `activation` | `'click' \| 'mouse-down'` | `'click'` |

Mouse-down mode uses primary mouse Pointer Events, suppressing the matching release
click. Touch, pen, keyboard, and assistive-technology activation remain supported.
Native links and form submit/reset controls retain their browser click behavior.
Button's native capture/once/passive click listeners also retain click timing.
Dragging, hover, text editing, context-menu gestures and outside dismissal retain
their existing event models.

Consumer-owned native slot controls use [useActivation](/composables/use-activation).
The provider does not intercept arbitrary consumer markup.
