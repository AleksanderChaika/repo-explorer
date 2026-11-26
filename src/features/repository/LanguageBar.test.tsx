import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RepositoryLanguages } from '@/api/types';
import LanguageBar from './LanguageBar';

function renderedRows(languages: RepositoryLanguages) {
  render(<LanguageBar languages={languages} />);
  return screen.getAllByRole('listitem').map((item) => item.textContent);
}

describe('LanguageBar', () => {
  it('lists the six largest languages and sums the rest into Other', () => {
    const rows = renderedRows({
      Shell: 20,
      TypeScript: 400,
      HTML: 80,
      Go: 150,
      Makefile: 10,
      CSS: 200,
      Ruby: 40,
      Python: 100,
    });

    expect(rows).toEqual([
      'TypeScript 40.0%',
      'CSS 20.0%',
      'Go 15.0%',
      'Python 10.0%',
      'HTML 8.0%',
      'Ruby 4.0%',
      'Other 3.0%',
    ]);
  });

  it('gives the spare tenth of equal shares to the first by name', () => {
    const rows = renderedRows({ C: 1, B: 1, A: 1 });

    expect(rows).toEqual(['A 33.4%', 'B 33.3%', 'C 33.3%']);
  });

  it('does not hand the share of a tiny language to the others', () => {
    const rows = renderedRows({ TypeScript: 6665, CSS: 3326, Shell: 9 });

    expect(rows).toEqual(['TypeScript 66.6%', 'CSS 33.3%', 'Shell <0.1%']);
  });
});
