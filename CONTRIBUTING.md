# Contributing to MediaPlayerX

Thank you for your interest in contributing to MediaPlayerX!

## How to Contribute

1.  **Fork the Repository**: Create a personal fork of the project on GitHub.
2.  **Clone the Repository**: Clone your fork to your local machine.
3.  **Create a Branch**: Create a new branch for your feature or bug fix.
4.  **Make Your Changes**: Implement your changes, ensuring you follow the project's code style and conventions.
5.  **Run Tests**: Ensure all tests pass by running `npm run test`.
6.  **Run Lint**: Ensure your code passes linting by running `npm run lint`.
7.  **Submit a Pull Request**: Push your changes to your fork and submit a PR to the main repository.

## Coding Guidelines

*   **Language**: Use Chinese for communication, documentation, and comments.
*   **TypeScript**: Use TypeScript for all new code. Avoid `any`.
*   **ESM**: Use ES Modules (`import`/`export`).
*   **Naming**: Use `camelCase` for variables/functions, `PascalCase` for classes/interfaces.
*   **JSDoc**: Provide JSDoc comments for public functions and complex logic.

## Quality Standards

*   All PRs must pass the existing test suite.
*   New features should include corresponding unit or integration tests.
*   Follow the **Single Source of Truth (SSOT)** principle by updating relevant documentation in `docs/` alongside code changes.

## Development Environment

*   **Node.js**: Primary runner is `bun` (v1.3.5), fallback to `npm`.
*   **Database**: SQLite is used for local persistence.
*   **UI**: React with custom theme system (Style x Palette).
*   **Desktop**: Electron for desktop capability.

---
*Created on 2026-02-12*
