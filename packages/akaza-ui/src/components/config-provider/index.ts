import type { ActivationMode } from "../../composables/activation";

export { default as AkazaConfigProvider } from "./AkazaConfigProvider.vue";

export interface AkazaConfigProviderProps {
  activation?: ActivationMode;
}
