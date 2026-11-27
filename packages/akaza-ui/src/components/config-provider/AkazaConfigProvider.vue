<script setup lang="ts">
import type { AkazaConfigProviderProps } from ".";
import { provide, toRef } from "vue";
import { activationKey } from "../../composables/activation";

const props = withDefaults(defineProps<AkazaConfigProviderProps>(), {
  activation: "click",
});

provide(activationKey, toRef(props, "activation"));
</script>

<template>
  <slot />
</template>
