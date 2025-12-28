# Contributing to WALL·E Gallery

Thanks for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/wall-e.git
   cd wall-e
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run linting and type checks:
   ```bash
   npm run lint
   npm run build
   ```
4. Commit your changes with a clear message:
   ```bash
   git commit -m "Add: description of what you added"
   ```

### Commit Message Format

Use clear, descriptive commit messages:

- `Add: new feature or file`
- `Fix: bug fix description`
- `Update: enhancement to existing feature`
- `Remove: removed feature or file`
- `Refactor: code refactoring`
- `Docs: documentation updates`

## Pull Request Process

1. Push your branch to your fork
2. Open a Pull Request against the `main` branch
3. Fill out the PR template with:
   - Summary of changes
   - Screenshots (for UI changes)
   - Testing done
4. Wait for review and address any feedback

## Code Style

### TypeScript

- Use TypeScript for all new code
- Use `type` imports for type-only imports:
  ```typescript
  import type { WallpaperImage } from '../types';
  ```
- Prefer explicit types over `any`

### React

- Use functional components with hooks
- Use `React.memo` for expensive components
- Keep components focused and single-purpose

### Styling

- Use Tailwind CSS utility classes
- Follow existing patterns in the codebase
- Support both light and dark themes

## Project Structure

```
src/
├── components/     # React components
├── contexts/       # React contexts
├── hooks/          # Custom React hooks
├── lib/            # Utilities and services
├── types/          # TypeScript type definitions
└── data/           # Static data (default engines)
```

## Adding New Features

### Adding a Default Collection

1. Edit `src/data/default-engines.json`
2. Add a new engine object with required fields:
   ```json
   {
     "id": "unique-id",
     "name": "owner/repo",
     "repoOwner": "owner",
     "repoName": "repo",
     "branch": "main",
     "treeSha": "commit-sha",
     "excludedFolders": [],
     "imageExtensions": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"],
     "isDefault": true,
     "avatarUrl": "https://github.com/owner.png"
   }
   ```
3. Get the tree SHA:
   ```bash
   curl -s https://api.github.com/repos/OWNER/REPO/branches/main | grep '"sha"' | head -1
   ```

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include steps to reproduce for bugs
- Check existing issues before creating new ones

## Questions?

Feel free to open an issue for any questions about contributing.

---

Thank you for contributing!
