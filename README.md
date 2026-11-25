# repo-explorer

Search public GitHub repositories, sort the results and page through them.

**Live:** https://repo-explorer-theta.vercel.app

![Search results in repo-explorer](docs/screenshots/search.png)

## Features

- Search public repositories by name or keyword. The request starts 500 ms after you stop typing, or at once on Enter; queries need at least 2 characters.
- Sort by best match, or by stars, forks, help wanted issues or recent update in descending or ascending order.
- 20 results per page, up to the 1,000 results GitHub returns for a search.
- Each result shows the owner, description, language, stars, forks and last update date, and links to the repository on GitHub in a new tab.
- Separate views for loading, no results, network and server errors, and the GitHub rate limit.
- No sign-in or token.

## Technical highlights

- **The URL holds the search state** (`q`, `sort`, `order`, `page`), so a search can be shared and Back works. A route loader rewrites invalid or redundant parameters with a replace navigation, so they do not add history entries. A page past the last one is replaced with the last page.
- **Rate limit handling.** Without a token GitHub allows 10 search requests per minute. After a rate limit response, a shared gate stops further requests until the reset time: a new search shows "Search paused" with a countdown and runs on its own afterwards. Typing is debounced and rate limit errors are not retried, so the quota is not wasted.
- **Previous results stay on screen while the next ones load**, marked with a loading line and `aria-busy`. Old empty results and pages past the last one show a skeleton instead, so "no results" does not flash before the real answer.
- **Accessibility.** One persistent `status` region announces outcomes and one `alert` region announces errors, because a live region added together with its text is announced unreliably. Focus follows Previous, Next and Retry so keyboard users are not left at the top of the document. `eslint-plugin-jsx-a11y` is part of the ESLint setup.
- **Tests.** 500+ tests with Vitest, React Testing Library and MSW, which mocks GitHub at the network level so the real request code runs. While writing them, each new test was checked by temporarily breaking the code it covers and seeing it fail.
- **Checks before code lands.** Strict TypeScript; a pre-commit hook runs ESLint, Stylelint, Prettier and the type check on staged changes; GitHub Actions runs lint, format check, type check, tests and the build on every pull request.

## Tech stack

- React 19.3, TypeScript 6.0 (strict)
- React Router 8.5 (data mode), TanStack Query 5
- SCSS modules, CSS custom properties
- Vite 8.3
- Vitest 5.1, React Testing Library 16, user-event 14, MSW 3
- ESLint 9, Stylelint 17, Prettier 3
- GitHub Actions, Vercel

## Getting started

Requires Node 24.

```sh
npm ci
npm run dev
```

| Command                 | What it does                        |
| ----------------------- | ----------------------------------- |
| `npm test`              | Run the tests once                  |
| `npm run test:watch`    | Run the tests in watch mode         |
| `npm run test:coverage` | Run the tests with coverage         |
| `npm run lint`          | ESLint                              |
| `npm run stylelint`     | Stylelint for SCSS                  |
| `npm run format:check`  | Check formatting with Prettier      |
| `npm run typecheck`     | Type check with `tsc`               |
| `npm run build`         | Type check and build for production |
| `npm run preview`       | Serve the production build locally  |

## Project structure

```
src/
  api/               GitHub client, typed errors, query client
  app/               providers, router and routes
  components/        shared layout
  features/search/   search state, hooks and components
  pages/             route components
  styles/            tokens, reset and mixins
  test/              test setup, fixtures and render helpers
```

## Known limitations

- An in-app navigation to a non-canonical URL replaces the current history entry. The app only builds canonical links.
- Changing only the sort or page does not cancel text still waiting for the debounce.
- A cached result with the same announcement text is not announced again.
- Focus is handled for the results heading only; focus on a card or pagination link that disappears falls to the page body.
- Avatars are requested with an `s` size parameter that GitHub does not document. If it stops working, the full image is shown at the same size.

## Roadmap

- Repository page
- Filters
- Favorites
- Theme

## Author

Oleksandr Chaika — [LinkedIn](https://www.linkedin.com/in/oleksander-chaika-466172422)
