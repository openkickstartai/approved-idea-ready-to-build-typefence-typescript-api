# TypeFence

TypeScript API boundary runtime guard generator. Eliminate **type illusions** by generating [Zod](https://zod.dev) runtime validation schemas from your TypeScript interfaces.

## Problem

TypeScript types are erased at runtime. API responses typed as `User` could contain anything — `null`, wrong shapes, missing fields. TypeFence bridges this gap by generating real runtime validators.

## Install

```bash
npm install -g typefence
```

## Usage

Given `types.ts`:

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
  tags: string[];
}
```

Run:

```bash
typefence types.ts
```

Generates `types.guard.ts`:

```typescript
import { z } from "zod";

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().optional(),
  tags: z.array(z.string()),
});
export type UserGuarded = z.infer<typeof UserSchema>;
```

Use in your fetch calls:

```typescript
const data = await fetch('/api/user').then(r => r.json());
const user = UserSchema.parse(data); // throws if shape is wrong
```

### Options

```
typefence <input.ts> [--out <output.ts>]
typefence --help
```

## Supported Types

| TypeScript | Zod Output |
|---|---|
| `string`, `number`, `boolean` | `z.string()`, `z.number()`, `z.boolean()` |
| `any`, `unknown`, `null` | `z.any()`, `z.unknown()`, `z.null()` |
| `string[]` | `z.array(z.string())` |
| `string \| number` | `z.union([z.string(), z.number()])` |
| `name?: string` | `z.string().optional()` |
| `Address` (ref) | `AddressSchema` |

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
