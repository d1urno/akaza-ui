import type { InjectionKey, Ref } from "vue";
import { inject } from "vue";

export type ActivationMode = "click" | "mouse-down";

/** App-local configuration; nested providers can override their parent. */
export const activationKey: InjectionKey<Readonly<Ref<ActivationMode>>> = Symbol("akaza-activation");

type Action = (event: MouseEvent) => unknown;

const pendingPresses = new WeakMap<Document, () => void>();
const handledPresses = new WeakSet<Event>();
const interactive = "button, a[href], input, select, textarea, [contenteditable]:not([contenteditable=false]), [role=button], [role=checkbox], [role=radio], [role=switch]";

/** Consume only the release click for this mouse sequence, including a retargeted click
 * after an action unmounts its control. Keyboard/programmatic clicks remain available.
 * The short-lived listeners intentionally survive the control until release/cancel.
 */
function consumeReleaseClick(event: PointerEvent, document: Document) {
  if (handledPresses.has(event)) return;
  pendingPresses.get(document)?.();
  const view = document.defaultView;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cleanup() {
    clearTimeout(timer);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("pointerdown", cleanup, true);
    document.removeEventListener("pointerup", onRelease, true);
    document.removeEventListener("pointercancel", onCancel, true);
    view?.removeEventListener("blur", cleanup);
    if (pendingPresses.get(document) === cleanup) pendingPresses.delete(document);
  }

  function samePointer(next: PointerEvent) {
    return next.pointerId === event.pointerId;
  }

  function onClick(click: MouseEvent) {
    // detail=0 includes native keyboard and HTMLElement.click() activation.
    if (click.detail === 0 || click.button !== 0) return;
    if ("pointerId" in click && (click as PointerEvent).pointerId !== event.pointerId) return;
    cleanup();
    click.preventDefault();
    click.stopImmediatePropagation();
  }

  function onRelease(next: PointerEvent) {
    if (!samePointer(next)) return;
    // Native click follows pointerup before the next timer task. If release generates
    // no click (e.g. outside the window), do not suppress a later unrelated click.
    timer = setTimeout(cleanup, 0);
  }

  function onCancel(next: PointerEvent) {
    if (samePointer(next)) cleanup();
  }

  pendingPresses.set(document, cleanup);
  document.addEventListener("click", onClick, true);
  document.addEventListener("pointerdown", cleanup, true);
  document.addEventListener("pointerup", onRelease, true);
  document.addEventListener("pointercancel", onCancel, true);
  view?.addEventListener("blur", cleanup);
}

/** Add to an existing click action. Touch/pen and native link/form activation stay
 * on click; no synthetic click is dispatched and the original action is unchanged.
 * @example
 * ```ts
 * // In a component below <AkazaConfigProvider activation="mouse-down">:
 * const activation = useActivation();
 * const triggerEvents = activation.bindings(event => open(event));
 * // <button type="button" v-bind="triggerEvents">Open</button>
 * ```
 */
export function useActivation() {
  const mode = inject(activationKey, undefined);

  function onPointerDown(event: PointerEvent, action: Action, disabled = false) {
    if (mode?.value !== "mouse-down" || disabled || event.pointerType !== "mouse"
      || event.button !== 0 || event.isPrimary === false
      || event.defaultPrevented || handledPresses.has(event)) return;

    const element = event.currentTarget as HTMLElement | null;
    if (!element?.matches || element.matches(":disabled, [aria-disabled=true], [aria-readonly=true], [readonly]")
      || element.closest("[inert]")) return;
    // Native navigation and form submission/reset need their browser click defaults.
    if (element.matches("a[href], button[type=submit], button[type=reset], input[type=submit], input[type=reset], input[type=image]")
      || (element.tagName === "BUTTON" && !element.hasAttribute("type") && element.closest("form"))) return;

    const target = event.target as Element | null;
    const childControl = target?.closest?.(interactive);
    if (childControl && childControl !== element && element.contains(childControl)) return;

    consumeReleaseClick(event, element.ownerDocument);
    handledPresses.add(event);
    // Focus before the action; otherwise the browser's later mousedown can steal
    // focus back from a newly opened popup. Non-focusable options keep input focus.
    if (element.matches("button, input, select, textarea, a[href], [tabindex]")) {
      element.focus({ preventScroll: true });
    }
    try {
      return action(event);
    } finally {
      // Let actions inspect/cancel the original event before preventing native focus.
      event.preventDefault();
    }
  }

  /** Bind to consumer-owned triggers instead of adding a separate click handler. */
  function bindings(action: Action, disabled: () => boolean = () => false) {
    return {
      onPointerdown: (event: PointerEvent) => onPointerDown(event, action, disabled()),
      onClick: (event: MouseEvent) => {
        if (!disabled()) return action(event);
      },
    };
  }

  return { onPointerDown, bindings };
}
