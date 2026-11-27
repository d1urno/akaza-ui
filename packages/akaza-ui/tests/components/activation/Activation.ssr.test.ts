// @vitest-environment node
import { expect, it } from "vitest";
import { createSSRApp, defineComponent, h, inject } from "vue";
import { renderToString } from "vue/server-renderer";
import { activationKey, AkazaConfigProvider, Button, useActivation } from "@/index";

it("isolates concurrent SSR policies without accessing DOM or adding provider markup", async () => {
  const Child = defineComponent({
    setup() {
      const mode = inject(activationKey, undefined);
      useActivation();
      return () => h(Button, null, () => mode?.value ?? "default");
    },
  });
  const render = (activation?: "click" | "mouse-down") => renderToString(createSSRApp({
    render: () => activation ? h(AkazaConfigProvider, { activation }, () => h(Child)) : h(Child),
  }));
  const [early, late, unconfigured] = await Promise.all([render("mouse-down"), render("click"), render()]);
  expect(early.replace(/<!--.*?-->/g, "")).toContain(">mouse-down</button>");
  expect(late.replace(/<!--.*?-->/g, "")).toContain(">click</button>");
  expect(unconfigured.replace(/<!--.*?-->/g, "")).toContain(">default</button>");
  expect(early).not.toContain("<div");
});
