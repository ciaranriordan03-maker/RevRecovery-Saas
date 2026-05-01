<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RevRecovery Engineering Rules

## Verification

- Run `npm run lint` and `npm run build` before considering a change complete.
- If either command fails, fix the issue before handing work back.
- Keep the local preview running with `npm run dev` when user-facing UI work is being reviewed.

## Next.js App Router

- Use App Router pages under `app/**/page.tsx`.
- Keep route files small. Pages should compose shared components rather than hold large UI implementations.
- Prefer Server Components by default. Add `"use client"` only to components that need browser state, event handlers, effects, or browser-only APIs.
- Do not put reusable component files at special App Router metadata names such as `icon.tsx`, `opengraph-image.tsx`, or `twitter-image.tsx` inside `app/`.
- Use `next/link` for internal navigation.
- Use route-level `metadata` exports for page titles and descriptions.

## Data And API Boundaries

- Never call the database directly from Client Components.
- Client Components must interact with backend data through API routes, Server Actions, or Server Components.
- Put API handlers under `app/api/**/route.ts`.
- Keep database/client SDK imports out of `"use client"` files and route UI components.
- Validate API inputs at the boundary before calling database code.

## Components

- Prefer shared components over duplicated page markup.
- Put reusable UI in `app/components/**`.
- Put shared constants and typed data in `app/lib/**`.
- Keep component props explicit and typed.
- Keep components focused: page shell, navigation, card, form control, and content sections should be separate when reused or complex.

## Styling

- Use `app/globals.css` CSS variables for colors, radii, shadows, and font tokens.
- Do not hard-code hex colors in TS/TSX files. Add or reuse a CSS variable in `globals.css`.
- Prefer Tailwind utilities backed by `var(...)`, for example `bg-[var(--primary)]`.
- Do not use inline `style` attributes for app UI except for rare dynamic values that cannot be expressed with classes.
- Follow the current design language: white/gray surfaces, indigo primary actions, compact dashboard typography, 8px controls, and 14px cards.

## React

- Use controlled state only where interaction requires it.
- Avoid prop drilling when route-level composition or a small shared component can simplify the interface.
- Keep accessibility basics in place: semantic headings, labels for inputs, real buttons for actions, and links for navigation.
- Avoid unnecessary effects; derive render state from props/state where possible.
