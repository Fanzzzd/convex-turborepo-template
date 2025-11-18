# Convex Turborepo Template

A modern full-stack TypeScript template combining React, TanStack Router, React Native (Expo), Convex, and Turborepo.

> **📦 Template Usage**: This is a template repository. See [Using This Template](#using-this-template) section below for instructions on how to use it.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Convex** - Reactive backend-as-a-service platform
- **Convex Auth** - Authentication with `@convex-dev/auth`
- **Turborepo** - Optimized monorepo build system

## Using This Template

There are two ways of initializing an app using this template:

### Option 1: GitHub Template

1. Click the **"Use this template"** button on GitHub
2. Create a new repository with your project name
3. Clone your new repository

### Option 2: Turborepo CLI (Recommended)

```bash
npx create-turbo@latest -e https://github.com/your-username/convex-turborepo-template
```

The CLI will prompt you for a project name and create a new directory with the template.

### Replace Package Names

In this template, we use `@acme` as a placeholder for package names. As a user, you might want to replace it with your own organization or project name.

You can use find-and-replace to change all instances of `@acme` to something like `@my-company` or `@project-name`:

- In VS Code: Use global search (`Cmd/Ctrl+Shift+F`) to find `@acme` and replace all with your project name
- Or use command line: `rg "@acme" -l | xargs sed -i '' 's/@acme/@your-project/g'`

This will update:
- All `package.json` files
- All import statements in `.ts`/`.tsx` files
- Turbo and TypeScript configuration references

## Getting Started

After setting up the template, install the dependencies:

```bash
pnpm install
```

## Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
pnpm run dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

### Convex Auth Setup

This template uses `@convex-dev/auth` for authentication. After setting up Convex, you need to initialize Convex Auth:

```bash
cd packages/backend
npx @convex-dev/auth
```

This command will:
- Set up the necessary environment variables
- Configure authentication providers
- Add required HTTP routes

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
Use the Expo Go app to run the mobile application.
Your app will connect to the Convex cloud backend automatically.







## Project Structure

```
your-project/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   ├── native/      # Mobile application (React Native, Expo)
├── packages/
│   └── backend/     # Convex backend functions and schema
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:setup`: Setup and configure your Convex project
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run dev:native`: Start the React Native/Expo development server
