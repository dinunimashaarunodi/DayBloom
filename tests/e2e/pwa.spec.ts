import { expect, test } from "@playwright/test"

import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/supabase"
import { logIn } from "./helpers"

test("the app is installable: manifest and icons", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest")
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest).toMatchObject({
    name: "DayBloom",
    start_url: "/today",
    display: "standalone",
  })
  expect(
    manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable"),
  ).toBe(true)
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const image = await request.get(icon.src)
    expect(image.ok(), icon.src).toBe(true)
    expect(image.headers()["content-type"]).toBe("image/png")
  }
  expect((await request.get("/apple-icon.png")).ok()).toBe(true)
})

test("the service worker and offline page load signed out", async ({
  request,
}) => {
  const sw = await request.get("/sw.js", { maxRedirects: 0 })
  expect(sw.status()).toBe(200)
  expect(sw.headers()["cache-control"]).toContain("no-store")
  expect(sw.headers()["content-type"]).toContain("javascript")

  const offline = await request.get("/offline.html", { maxRedirects: 0 })
  expect(offline.status()).toBe(200)
  expect(await offline.text()).toContain("You're offline")
})

test.describe("signed in", () => {
  let user: TestUser

  test.beforeEach(async ({ page }) => {
    user = await createTestUser({ display_name: "Ama", timezone: "UTC" })
    await page.goto("/login")
    await logIn(page, user.email, user.password)
    await expect(page).toHaveURL(/\/today$/)
  })

  test.afterEach(async () => {
    await deleteTestUser(user)
  })

  test("going offline shows a banner, and page loads show the offline page", async ({
    page,
    context,
  }) => {
    // The worker installs and takes control of the page.
    await page.evaluate(() => navigator.serviceWorker.ready)
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true)

    await context.setOffline(true)
    await expect(
      page.getByRole("status").filter({ hasText: "offline" }),
    ).toContainText("kept on this device")

    // A full page load can't reach the server: the friendly page shows.
    await page.reload()
    await expect(
      page.getByRole("heading", { name: "You're offline" }),
    ).toBeVisible()

    await context.setOffline(false)
    await page.getByRole("button", { name: "Try again" }).click()
    await expect(page).toHaveURL(/\/today$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ama")
  })

  test("Settings explains how to install", async ({ page }) => {
    await page.goto("/settings")
    const install = page.getByRole("heading", { name: "Install the app" })
    await expect(install).toBeVisible()
    // Headless Chromium doesn't offer an install prompt, so the steps show.
    await expect(page.getByText("Open your browser's menu")).toBeVisible()
  })
})
