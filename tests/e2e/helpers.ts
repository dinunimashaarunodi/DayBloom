import type { Page } from "@playwright/test"

/** Fills in and submits the login form on the current page. */
export async function logIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Log in" }).click()
}
