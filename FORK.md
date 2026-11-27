# Mouse-down activation fork

Upstream: https://github.com/igris-labs/akaza-ui

Initial base: `27943698a695e611f5acee42fe782ef9f33a4376` (`0.0.11-alpha`).

## Usage

```vue
<script setup lang="ts">
import { AkazaConfigProvider } from "akaza-ui";
</script>

<template>
  <AkazaConfigProvider activation="mouse-down">
    <App />
  </AkazaConfigProvider>
</template>
```

Without a provider, behavior remains upstream's `click` behavior. Providers add no
DOM, are reactive, are scoped to their Vue subtree (including Teleport), and can be
nested with `activation="click"` to opt a section out. Configuration is not stored
in process-wide state, so SSR requests do not share policy.

`mouse-down` activates eligible actions on primary mouse `pointerdown`. Touch and
pen remain release-based, including compatibility mouse events, so scrolling does
not activate controls. Keyboard and assistive-technology clicks remain supported.
The release click associated with an early action is consumed, including when the
action removes the target. Consequently ancestor DOM click listeners do not observe
that release; use component action/change events for application behavior.

Existing action callbacks and cancelable change events are reused. Their `event`
is the actual PointerEvent on early activation (a MouseEvent subtype), rather than
a fabricated click. Default prevention cancels native focus movement after the
action; use `details.cancel()` to cancel Akaza value/state changes as before.

## Consumer-owned triggers

Akaza `Button` participates automatically, including `loadingAuto`. Native buttons
supplied through slots belong to the consumer; use the public composable in a
component below the provider:

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
    <template #content>Content</template>
  </Popover>
</template>
```

Do not add a second click handler alongside `bindings()`. For custom disabled
controls, pass a getter as its second argument and retain their native/ARIA disabled
attributes. The composable must run in a descendant's setup, not the same setup that
renders its provider.

## Deliberate boundaries

- Native links and submit/reset buttons keep browser click defaults, including
  validation, navigation and modifier behavior.
- Button listeners using native `capture`, `once`, or `passive` event options keep
  click timing so their ordering and lifetime are preserved. Ordinary `@click`,
  `.stop`, `.prevent`, and `loadingAuto` participate in early activation.
- Dragging, sliders, scrubbing, text input, hover, context-menu gestures and outside
  dismissal retain their existing event models.
- Focus-only clicks on Combobox/TagsInput roots and Sidebar navigation dismissal
  stay on click. Editable's focus/double-click activation modes remain distinct;
  its click activation mode and action buttons honor the policy.
- Built-in discrete actions are integrated at shared implementations such as
  MenuPanel, Calendar, PeriodPicker, Checkbox and Listbox, so composed controls
  inherit their behavior without copied patches.
- Popup slot controls use Button or the public helper. No consumer markup is
  automatically intercepted or rewritten.

## Updating upstream

Keep fork `main` as the upstream baseline and maintain changes on the feature branch
(or a designated integration branch after review). Merge upstream with a merge
commit; do not rebase published integration history:

```sh
git fetch upstream
git switch pablo/mouse-down-activation
git merge --no-ff upstream/main
pnpm install --frozen-lockfile
pnpm --filter akaza-ui check:activation
pnpm --filter akaza-ui lint
pnpm --filter akaza-ui typecheck
pnpm --filter akaza-ui test
pnpm --filter akaza-ui build
pnpm --filter akaza-ui test:packaging
pnpm --filter akaza-ui test:activation
```

The template audit flags new unintegrated click bindings and stale exceptions.
It is a review aid, not proof: also review script-created event props, public slot
contracts and SDK popup/button binding changes. Retain upstream click handlers and
business logic; add a call to `useActivation().onPointerDown()` at the control.
Handlers receive the original event, and the helper avoids capturing presses on
nested interactive children. Complex bubbling behavior (e.g. table cell/row actions)
needs an explicit regression test.

The dedicated browser suite checks Chromium, Firefox, WebKit, and mobile tap
behavior. Chromium also exercises real touch scrolling. Upstream's check workflow
remains in place; the additional fork workflow verifies activation separately.

No npm publication or Spentier dependency migration is included in this change.
