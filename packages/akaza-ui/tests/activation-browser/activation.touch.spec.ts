import { expect, test } from "@playwright/test";

test("touch activates on release, not pointerdown or compatibility mousedown", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const values: string[] = [];
    const button = [...document.querySelectorAll("button")].find(element => element.textContent === "Count")!;
    for (const type of ["pointerdown", "mousedown", "pointerup"]) {
      button.addEventListener(type, () => values.push(`${type}:${document.querySelector('[data-testid=count]')!.textContent}`));
    }
    (window as unknown as { pressObservations: string[] }).pressObservations = values;
  });
  await page.getByRole("button", { name: "Count", exact: true }).tap();
  await expect(page.getByTestId("count")).toHaveText("1");
  const values = await page.evaluate(() => (window as unknown as { pressObservations: string[] }).pressObservations);
  expect(values).toContain("pointerdown:0");
  expect(values).toContain("pointerup:0");
  expect(values.filter(value => value.startsWith("mousedown:")).every(value => value === "mousedown:0")).toBe(true);
});

test("touch scrolling over buttons does not activate them", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP touch gestures are Chromium-only; native taps run on both engines.");
  await page.goto("/");
  const scroller = page.getByTestId("scroll");
  await scroller.scrollIntoViewIfNeeded();
  const box = (await scroller.boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const point = { x: box.x + 80, y: box.y + 95 };
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  for (let step = 1; step <= 5; step++) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x, y: point.y - step * 15 }] });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByTestId("count")).toHaveText("0");
});
