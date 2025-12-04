# VistoneServer

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is almost ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/nx-api/node?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Finish your CI setup

[Click here to finish setting up your workspace!](https://cloud.nx.app/connect/IkQdPjV0iY)


## Run tasks

To run the dev server for your app, use:

```sh
npx nx serve vistone-server
```

To create a production bundle:

```sh
npx nx build vistone-server
```

To see all available targets to run for a project, run:

```sh
npx nx show project vistone-server
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
npx nx g @nx/node:app demo
```

To generate a new library, use:

```sh
npx nx g @nx/node:lib mylib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)


[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/nx-api/node?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:
- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)


Steps to Seed Data
1. Create .env file
Copy the example and configure your database:

Copy-Item .env.example .env

Then edit .env with your actual PostgreSQL credentials.

2. Create PostgreSQL schemas
Run the SQL in init-schemas.sql against your database:

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS workforce;
CREATE SCHEMA IF NOT EXISTS project;
CREATE SCHEMA IF NOT EXISTS client;
CREATE SCHEMA IF NOT EXISTS knowledge;
CREATE SCHEMA IF NOT EXISTS communication;
CREATE SCHEMA IF NOT EXISTS monitoring;
CREATE SCHEMA IF NOT EXISTS notification;


3. Push Prisma schemas and generate clients

```sh
npm run db:sync
```

4. Start all microservices (Development)

```sh
npm run dev
```

5. Run the seed script

```sh
npm run seed
```

## Database & Prisma Commands

### Development Mode
When running in development, the `npm run dev` command automatically:
- Pushes all Prisma schemas to the database
- Generates all Prisma clients
- Starts all microservices in development mode

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Sync database + start all services (development) |
| `npm run prod` | Generate clients + start all services (production) |
| `npm run db:sync` | Push schemas to DB + generate clients |
| `npm run db:push` | Push schemas to database only |
| `npm run prisma:generate` | Generate all Prisma clients |
| `npm run prisma:validate` | Validate all Prisma schemas |
| `npm run seed` | Run seed script |

### Individual Service Commands

```sh
# Run prisma generate for a specific service
nx run @vistone-server/auth-service:prisma:generate

# Push schema for a specific service
nx run @vistone-server/auth-service:prisma:push

# Serve a specific service
nx run @vistone-server/auth-service:serve
```

### Production Notes
- In production, `db:push` is disabled to prevent accidental schema changes
- Use proper migrations for production database changes
- The `npm run prod` command only generates clients, it doesn't modify the database

Would you like me to help you run these steps? What's your PostgreSQL connection string?