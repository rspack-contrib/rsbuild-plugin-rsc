import path from 'node:path';
import { expect, patchFile, retry, test } from '@e2e/helper';

const PROJECT_DIR = path.resolve(
  import.meta.dirname,
  '../../../examples/server',
);

const setup = async (dev: Dev, page: Page) => {
  const rsbuild = await dev({
    cwd: PROJECT_DIR,
  });
  page.goto(`http://localhost:${rsbuild.port}`);
  return rsbuild;
};

test('should refetch RSC payload when server component is modified', async ({
  page,
  dev,
}) => {
  await setup(dev, page);

  // Verify initial state
  const initialHeader = page.locator('header h1');
  await expect(initialHeader).toHaveText('Todos');

  // Modify the Todos.tsx file
  const todosTsxPath = path.join(PROJECT_DIR, 'src/Todos.tsx');

  await patchFile(
    todosTsxPath,
    (content) => content!.replace('<h1>Todos</h1>', '<h1>HMR Test Title</h1>'),
    async () => {
      await retry(async () => {
        const element = page.locator('header h1');
        await expect(element).toHaveText('HMR Test Title');
      });
    },
  );

  // Verify restoration after patchFile completes
  await retry(async () => {
    const element = page.locator('header h1');
    await expect(element).toHaveText('Todos');
  });
});

test('should preserving state when client component is modified', async ({
  page,
  dev,
}) => {
  await setup(dev, page);

  const timestamp = Date.now();
  const todoTitle = `Test Todo ${timestamp}`;
  const todoDescription = `Description for test todo ${timestamp}`;

  await page.click('header button:has-text("+")');

  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();

  await page.fill('input[name="title"]', todoTitle);
  await page.fill('textarea[name="description"]', todoDescription);

  // Modify the Dialog.tsx file
  const dialogTsxPath = path.join(PROJECT_DIR, 'src/Dialog.tsx');

  await patchFile(
    dialogTsxPath,
    (content) =>
      content!.replace(
        '<dialog ref={ref} onSubmit={() => ref.current?.close()}>',
        '<dialog ref={ref} onSubmit={() => ref.current?.close()} className="hmr-updated" data-hmr-test="true">',
      ),
    async () => {
      await retry(async () => {
        const updatedDialog = page.locator('dialog.hmr-updated');
        await expect(updatedDialog).toHaveAttribute('data-hmr-test', 'true');
      });
      // Verify form state is preserved after hot reload
      await expect(page.locator('input[name="title"]')).toHaveValue(todoTitle);
      await expect(page.locator('textarea[name="description"]')).toHaveValue(
        todoDescription,
      );
    },
  );
});

test('should not load CSS when "use server-entry" directive is removed', async ({
  page,
  dev,
}) => {
  await patchFile(
    path.join(PROJECT_DIR, 'src/Todos.tsx'),
    (content) => content!.replace("'use server-entry';", ''),
    async () => {
      await setup(dev, page);

      // Check page title
      await expect(page).toHaveTitle('Todos');

      // Check header is visible
      const header = page.locator('header h1');
      await expect(header).toBeVisible();
      await expect(header).toHaveText('Todos');

      // Check "Add todo" button is visible
      const addButton = page.locator('header button', { hasText: '+' });
      await expect(addButton).toBeVisible();

      const links = page.locator('link[rel="stylesheet"]');
      await expect(links).toHaveCount(0);
    },
  );
});
