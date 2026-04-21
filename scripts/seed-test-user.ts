/**
 * scripts/seed-test-user.ts
 *
 * Creates (or upserts) the Playwright E2E test user in the *test*
 * Supabase project. Never run against production — the script refuses
 * to run unless SUPABASE_TEST_PROJECT_URL is set and matches a test
 * domain pattern.
 *
 *   SUPABASE_TEST_PROJECT_URL=https://<test>.supabase.co \
 *   SUPABASE_TEST_SERVICE_ROLE=... \
 *   TEST_USER_EMAIL=e2e@example.test \
 *   TEST_USER_PASSWORD=... \
 *     npx tsx scripts/seed-test-user.ts
 */

const url = process.env.SUPABASE_TEST_PROJECT_URL;
const serviceRole = process.env.SUPABASE_TEST_SERVICE_ROLE;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

if (!url || !serviceRole || !email || !password) {
  console.error(
    'Missing env. Required: SUPABASE_TEST_PROJECT_URL, ' +
      'SUPABASE_TEST_SERVICE_ROLE, TEST_USER_EMAIL, TEST_USER_PASSWORD',
  );
  process.exit(1);
}

// Guard against pointing at prod by mistake.
if (!/test|staging|preview/i.test(url)) {
  console.error(
    `Refusing to run: ${url} does not look like a test/staging ` +
      `project URL. Use a dedicated Supabase test project.`,
  );
  process.exit(1);
}

async function seed(): Promise<void> {
  const adminUrl = `${url}/auth/v1/admin/users`;
  const response = await fetch(adminUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRole}`,
      apikey: serviceRole as string,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  if (response.status === 422) {
    // User already exists — fine for CI reruns.
    console.log(`Test user ${email} already exists; leaving as-is.`);
    return;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Admin create-user failed (${response.status}): ${body}`);
  }

  console.log(`Seeded test user ${email}.`);
}

seed().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
