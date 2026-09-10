# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Authentication and administrator bootstrap

Create `.env` from `.env.example`, set the PostgreSQL and Better Auth secrets, then run migrations. The initial Super Admin should be created with the server-side bootstrap command:

```bash
pnpm db:seed
```

Set `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, and optionally `SUPER_ADMIN_NAME` in the environment. Never commit `.env` or real credentials.

Students register through `/signup` and begin in `PENDING` status. Authorized hostel administrators approve them from `/admin/students`; after approval, the student can sign in and is routed to `/student`.

Users can hold multiple roles on one account (for example `STUDENT + PRESIDENT` or `STUDENT + MESS_COMMITTEE`). Administrative accounts are created by a user with `users.manage` from `/admin/system`.

Mess collection distinguishes the meal beneficiary from the physical collector. A student can delegate a meal to another student, and Mess Employees can record same-day proxy collection without double-counting the meal.
