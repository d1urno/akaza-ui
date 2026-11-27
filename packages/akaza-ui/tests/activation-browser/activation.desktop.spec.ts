import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function down(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Missing press target");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

test.beforeEach(async ({ page }) => { await page.goto("/"); });

test("activates once on mouse-down with keyboard and subtree fallback", async ({ page }) => {
  const button = page.getByRole("button", { name: "Count", exact: true });
  await down(page, button);
  await expect(page.getByTestId("count")).toHaveText("1");
  await page.mouse.up();
  await expect(page.getByTestId("count")).toHaveText("1");
  await button.press("Enter");
  await button.press("Space");
  await expect(page.getByTestId("count")).toHaveText("3");
  await down(page, page.getByRole("button", { name: "Release", exact: true }));
  await expect(page.getByTestId("late")).toHaveText("0");
  await page.mouse.up();
  await expect(page.getByTestId("late")).toHaveText("1");
});

test("suppresses retargeted clicks after unmount and supports async loading", async ({ page }) => {
  await down(page, page.getByRole("button", { name: "Remove on press" }));
  await expect(page.getByText("Removed", { exact: true })).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId("ancestor-count")).toHaveText("0");
  await down(page, page.getByRole("button", { name: "Save", exact: true }));
  await expect(page.getByTestId("saved")).toHaveText("1");
  // Hold past completion: the release must still not re-run the callback.
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await page.mouse.up();
  await expect(page.getByTestId("saved")).toHaveText("1");
});

test("checkable controls, tabs, number commits and table selection run once", async ({ page }) => {
  for (const role of ["checkbox", "switch"] as const) {
    const control = page.getByRole(role).first();
    await down(page, control);
    await expect(control).toBeChecked();
    await page.mouse.up();
    await expect(control).toBeChecked();
  }
  const toggle = page.getByRole("button", { name: "Toggle", exact: true });
  await down(page, toggle);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.mouse.up();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await down(page, page.getByRole("button", { name: "Increment", exact: true }));
  await expect(page.getByRole("spinbutton", { name: "Amount" })).toHaveValue("3");
  await page.mouse.up();
  await expect(page.getByTestId("commits")).toHaveText("1");
  await down(page, page.getByRole("tab", { name: "Second" }));
  await expect(page.getByRole("tab", { name: "Second" })).toHaveAttribute("aria-selected", "true");
  await page.mouse.up();
  await down(page, page.getByRole("cell", { name: "Ada" }));
  await page.mouse.up();
  await expect(page.locator(".akaza-data-table-row")).toHaveAttribute("data-akaza-selected", "true");
});

test("teleported selection and popup triggers preserve state and focus", async ({ page }) => {
  await down(page, page.getByRole("combobox", { name: "Framework" }));
  await expect(page.getByRole("option", { name: "Vue", exact: true })).toBeVisible();
  await page.mouse.up();
  await down(page, page.getByRole("option", { name: "Vue", exact: true }));
  await expect(page.getByTestId("selected")).toHaveText("vue");
  await page.mouse.up();
  await expect(page.getByTestId("selected")).toHaveText("vue");
  await page.keyboard.press("Escape");
  await down(page, page.getByRole("button", { name: "Open menu" }));
  await expect(page.getByRole("menuitem", { name: "Run action" })).toBeVisible();
  await page.mouse.up();
  await expect(page.getByRole("menuitem", { name: "Run action" })).toBeFocused();
  await down(page, page.getByRole("menuitem", { name: "Run action" }));
  await expect(page.getByTestId("menu-selections")).toHaveText("1");
  await page.mouse.up();
  await expect(page.getByTestId("menu-selections")).toHaveText("1");
  await page.getByRole("button", { name: "Open popover" }).click();
  await expect(page.getByRole("button", { name: "Close popover" })).toBeVisible();
  await page.getByRole("button", { name: "Close popover" }).click();
  await page.getByRole("button", { name: "Consumer trigger" }).click();
  await expect(page.getByText("Consumer popup")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close dialog" })).toBeFocused();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("button", { name: "Open dialog" })).toBeFocused();
});

test("native label clicks inside table cells retain checkbox activation", async ({ page }) => {
  await page.getByRole("cell", { name: "Ada", exact: true }).evaluate((cell) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const text = document.createElement("span");
    text.textContent = "Native cell checkbox";
    text.style.display = "inline-block";
    label.append(checkbox, text);
    cell.append(label);
  });
  const checkbox = page.getByRole("checkbox", { name: "Native cell checkbox" });
  for (const checked of [true, false]) {
    await down(page, page.getByText("Native cell checkbox", { exact: true }));
    await expect(checkbox).toBeChecked({ checked: !checked });
    await page.mouse.up();
    await expect(checkbox).toBeChecked({ checked });
  }
  await expect(page.locator(".akaza-data-table-row")).not.toHaveAttribute("data-akaza-selected", "true");
});

test("combobox option presses retain selection and form/link defaults stay native", async ({ page }) => {
  const search = page.getByRole("combobox", { name: "Search" });
  await search.fill("Vu");
  await down(page, page.getByRole("option", { name: "Vue", exact: true }));
  await page.mouse.up();
  await expect(search).toHaveValue("Vue");
  const submit = page.getByRole("button", { name: "Submit", exact: true });
  await submit.click();
  await expect(page.getByTestId("submitted")).toHaveText("0");
  await page.getByRole("textbox", { name: "Required" }).fill("Valid");
  await down(page, submit);
  await expect(page.getByTestId("submitted")).toHaveText("0");
  await page.mouse.up();
  await expect(page.getByTestId("submitted")).toHaveText("1");
  await down(page, page.getByRole("button", { name: "Native link" }));
  await expect(page).not.toHaveURL(/#destination$/);
  await page.mouse.up();
  await expect(page).toHaveURL(/#destination$/);
});
