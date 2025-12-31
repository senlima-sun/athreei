import { test, expect } from "@playwright/test";

test.describe("Dashboard Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    // Navigate to dashboard without being authenticated
    await page.goto("/dashboard");

    // Should be redirected to login page
    await expect(page).toHaveURL(/.*login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    // Check for key login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    // Check for register link
    await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
  });

  test("shows validation error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill("invalid@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");

    // Submit the form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for error message (the form shows errors in a red alert box)
    await expect(page.locator(".text-red-600")).toBeVisible({ timeout: 10000 });
  });

  test("allows authenticated users to access dashboard", async ({ page }) => {
    // Note: This test requires a valid test user to exist in the database
    // For CI, you should seed the database with test users or use a mock auth service
    //
    // To run this test, ensure you have:
    // 1. A running API server with the auth endpoint
    // 2. A test user: test@example.com / password123

    await page.goto("/login");

    // Fill in valid credentials (adjust these for your test environment)
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("password123");

    // Submit the form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for navigation away from login page
    // After successful login, user is redirected to "/" and then can access dashboard
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10000,
    });

    // Now navigate to dashboard
    await page.goto("/dashboard");

    // Should NOT be redirected to login
    await expect(page).not.toHaveURL(/.*login/);
  });
});

test.describe("Protected Routes", () => {
  const protectedRoutes = [
    "/dashboard",
    "/dashboard/organizations",
    "/dashboard/endpoints",
    "/dashboard/namespaces",
    "/dashboard/mcp-servers",
    "/dashboard/registry",
  ];

  for (const route of protectedRoutes) {
    test(`redirects unauthenticated user from ${route} to login`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/.*login/);
    });
  }
});

test.describe("Authentication Flow", () => {
  test("can navigate from login to register", async ({ page }) => {
    await page.goto("/login");

    // Click sign up link
    await page.getByRole("link", { name: /sign up/i }).click();

    // Should be on register page
    await expect(page).toHaveURL(/.*register/);
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");

    // Check for key register form elements
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();

    // Check for sign in link
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });
});
