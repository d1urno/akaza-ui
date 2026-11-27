<script setup lang="ts">
import type { ToggleProps } from ".";
import type { AkazaChangeEventDetails } from "../../types";
import { useActivation } from "../../composables/activation";
import { useButtonKeys } from "../../composables/internal/sdk/useButtonKeys";
import { createChangeDetails } from "../../utils/changeEvent";

const { as = "button", disabled = false, ariaLabel, ui } = defineProps<ToggleProps>();

const emit = defineEmits<{
  "pressed-change": [pressed: boolean, details: AkazaChangeEventDetails];
}>();

const model = defineModel<boolean>({ default: false });
const buttonKeys = useButtonKeys(() => disabled);

function toggle(event?: Event) {
  if (disabled) return;
  const next = !model.value;
  const changeEvent = createChangeDetails(event ? "trigger" : "programmatic", event);
  emit("pressed-change", next, changeEvent.details);
  if (!changeEvent.canceled()) model.value = next;
}

const activation = useActivation();
</script>

<template>
  <component
    :is="as"
    :type="as === 'button' ? 'button' : undefined"
    :role="as === 'button' ? undefined : 'button'"
    :aria-pressed="model"
    :aria-disabled="disabled || undefined"
    :aria-label="ariaLabel"
    :data-akaza-state="model ? 'on' : 'off'"
    :data-akaza-disabled="disabled || undefined"
    :disabled="as === 'button' ? disabled : undefined"
    :tabindex="as === 'button' ? undefined : disabled ? -1 : 0"
    :class="ui?.root"
    class="akaza-toggle"
    @pointerdown="activation.onPointerDown($event, event => toggle(event))"
    @click="toggle($event)"
    @keydown="buttonKeys.keydown"
    @keyup="buttonKeys.keyup"
  >
    <slot
      :pressed="model"
      :state="model ? 'on' : 'off'"
    />
  </component>
</template>
