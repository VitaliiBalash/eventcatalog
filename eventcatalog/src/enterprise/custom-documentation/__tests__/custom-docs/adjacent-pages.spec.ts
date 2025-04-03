import { getAdjacentPages } from '../../utils/custom-docs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockDocs } from './mocks';
import type { ContentCollectionKey } from 'astro:content';
import { join } from 'node:path';

const pathToTestCatalog = join(__dirname, 'fake-catalog');

// Mock the config module
vi.mock('@config', async () => {
  return {
    default: {
      customDocs: {
        sidebar: [
          {
            label: 'Guides',
            items: [
              { label: 'First Guide', slug: 'guides/first-guide' },
              { label: 'Second Guide', slug: 'guides/second-guide' },
              { label: 'Third Guide', slug: 'guides/third-guide' },
            ],
          },
          {
            label: 'Auto generated docs',
            autogenerated: { directory: 'auto-generated' },
          },
          {
            label: 'Nested Examples',
            items: [
              { label: 'Root page', slug: 'nested/root-page' },
              {
                label: 'Nested section',
                items: [
                  { label: 'Nested page 1', slug: 'nested/page1' },
                  { label: 'Nested page 2', slug: 'nested/page2' },
                ],
              },
            ],
          },
        ],
      },
    },
  };
});

// Mock the astro:content module
vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getEntry: (key: ContentCollectionKey, id: string) => {
      switch (key) {
        case 'customPages':
          return Promise.resolve(mockDocs.find((doc) => doc.id === id));
        default:
          return Promise.resolve([]);
      }
    },
  };
});

// Mock fs methods
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: {
      readdirSync: () => ['01-introduction.mdx', '02-hello-world.mdx'],
      readFileSync: () => `---
title: Mock Title
description: Mock Description
---
Content
`,
      statSync: () => ({
        isDirectory: () => false,
      }),
    },
    readdirSync: () => ['01-introduction.mdx', '02-hello-world.mdx'],
    readFileSync: () => `---
title: Mock Title
description: Mock Description
---
Content
`,
    statSync: () => ({
      isDirectory: () => false,
    }),
  };
});

describe('getAdjacentPages', () => {
  beforeEach(() => {
    process.env.PROJECT_DIR = pathToTestCatalog;
    vi.resetAllMocks();
  });

  it('returns null for prev when on the first page', async () => {
    const result = await getAdjacentPages('docs/guides/first-guide');

    expect(result.prev).toBeNull();
    expect(result.next).toEqual({
      label: 'Second Guide',
      slug: 'guides/second-guide',
    });
  });

  it('returns both prev and next for a middle page', async () => {
    const result = await getAdjacentPages('guides/second-guide');

    expect(result.prev).toEqual({
      label: 'First Guide',
      slug: 'guides/first-guide',
    });
    expect(result.next).toEqual({
      label: 'Third Guide',
      slug: 'guides/third-guide',
    });
  });

  it('returns null for next when on the last page', async () => {
    const result = await getAdjacentPages('nested/page2');

    expect(result.prev).toEqual({
      label: 'Nested page 1',
      slug: 'nested/page1',
    });
    expect(result.next).toBeNull();
  });

  it('returns null for both prev and next when page does not exist', async () => {
    const result = await getAdjacentPages('non-existent-page');

    expect(result.prev).toBeNull();
    expect(result.next).toBeNull();
  });

  it('handles nested navigation structure correctly', async () => {
    const result = await getAdjacentPages('nested/root-page');

    expect(result.prev).toEqual({
      label: 'Hello World',
      slug: '/auto-generated/02-hello-world',
    });
    expect(result.next).toEqual({
      label: 'Nested page 1',
      slug: 'nested/page1',
    });
  });
});
