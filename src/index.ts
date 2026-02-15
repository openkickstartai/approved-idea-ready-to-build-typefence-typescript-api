#!/usr/bin/env node
import * as ts from "typescript";
import * as fs from "fs";

export interface FieldInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface InterfaceInfo {
  name: string;
  fields: FieldInfo[];
}

export function parseInterfaces(source: string): InterfaceInfo[] {
  const sf = ts.createSourceFile("input.ts", source, ts.ScriptTarget.Latest, true);
  const result: InterfaceInfo[] = [];
  ts.forEachChild(sf, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const fields: FieldInfo[] = [];
      for (const m of node.members) {
        if (ts.isPropertySignature(m) && m.name) {
          fields.push({
            name: m.name.getText(sf),
            type: m.type ? m.type.getText(sf) : "unknown",
            optional: !!m.questionToken,
          });
        }
      }
      result.push({ name: node.name.text, fields });
    }
  });
  return result;
}

export function mapTypeToZod(tsType: string): string {
  const arrMatch = tsType.match(/^(.+)\[\]$/);
  if (arrMatch) return `z.array(${mapTypeToZod(arrMatch[1])})`;
  if (tsType.includes(" | ")) {
    const parts = tsType.split(" | ").map((t) => mapTypeToZod(t.trim()));
    return `z.union([${parts.join(", ")}])`;
  }
  const primitives: Record<string, string> = {
    string: "z.string()",
    number: "z.number()",
    boolean: "z.boolean()",
    any: "z.any()",
    unknown: "z.unknown()",
    null: "z.null()",
    undefined: "z.undefined()",
  };
  return primitives[tsType] || `${tsType}Schema`;
}

export function generateGuards(interfaces: InterfaceInfo[]): string {
  const lines: string[] = ['import { z } from "zod";', ""];
  for (const iface of interfaces) {
    lines.push(`export const ${iface.name}Schema = z.object({`);
    for (const f of iface.fields) {
      const zodExpr = mapTypeToZod(f.type) + (f.optional ? ".optional()" : "");
      lines.push(`  ${f.name}: ${zodExpr},`);
    }
    lines.push("});");
    lines.push(
      `export type ${iface.name}Guarded = z.infer<typeof ${iface.name}Schema>;`
    );
    lines.push("");
  }
  return lines.join("\n");
}

export function run(args: string[]): void {
  if (args.length === 0 || args.includes("--help")) {
    console.log("Usage: typefence <input.ts> [--out <output.ts>]");
    console.log("Generates Zod runtime guards from TypeScript interfaces.");
    process.exit(args.includes("--help") ? 0 : 1);
  }
  const input = args[0];
  const oi = args.indexOf("--out");
  const output =
    oi !== -1 && args[oi + 1]
      ? args[oi + 1]
      : input.replace(/\.ts$/, ".guard.ts");
  if (!fs.existsSync(input)) {
    console.error(`Error: file not found: ${input}`);
    process.exit(1);
  }
  const source = fs.readFileSync(input, "utf-8");
  const ifaces = parseInterfaces(source);
  if (ifaces.length === 0) {
    console.log("No interfaces found in " + input);
    return;
  }
  fs.writeFileSync(output, generateGuards(ifaces), "utf-8");
  console.log(`Generated ${ifaces.length} guard(s) -> ${output}`);
}

if (require.main === module) {
  run(process.argv.slice(2));
}
