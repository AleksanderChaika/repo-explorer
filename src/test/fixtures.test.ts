import { describe, expect, it } from 'vitest';
import { repository, searchResponse } from './fixtures';

describe('repository', () => {
  it('gives different names different ids', () => {
    const names = ['react', 'redux', 'vue', 'svelte', 'angular'];

    const ids = names.map((name) => repository(name).id);

    expect(new Set(ids).size).toBe(names.length);
  });

  it('gives the same name the same id', () => {
    expect(repository('react').id).toBe(repository('react').id);
  });

  it('gives the same name and different full names different ids', () => {
    const first = repository('react', { full_name: 'facebook/react' });
    const second = repository('react', { full_name: 'fork/react' });

    expect(first.id).not.toBe(second.id);
  });

  it('applies overrides', () => {
    expect(repository('react', { description: 'A library' }).description).toBe(
      'A library',
    );
  });

  it('keeps the default fields that are not overridden', () => {
    expect(repository('react', { description: 'A library' }).full_name).toBe(
      'owner/react',
    );
  });
});

describe('searchResponse', () => {
  it('counts the given names in total_count', () => {
    expect(searchResponse('react', 'redux', 'vue').total_count).toBe(3);
  });

  it('keeps the given names in order', () => {
    const { items } = searchResponse('react', 'redux', 'vue');

    expect(items.map((item) => item.name)).toEqual(['react', 'redux', 'vue']);
  });

  it('reports complete results', () => {
    expect(searchResponse('react').incomplete_results).toBe(false);
  });
});
