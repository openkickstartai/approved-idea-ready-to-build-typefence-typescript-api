import { parseInterfaces, mapTypeToZod, generateGuards } from "../src/index";

describe("parseInterfaces", () => {
  it("extracts fields from a simple interface", () => {
    const src = `interface User { id: number; name: string; active: boolean; }`;
    const result = parseInterfaces(src);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("User");
    expect(result[0].fields).toEqual([
      { name: "id", type: "number", optional: false },
      { name: "name", type: "string", optional: false },
      { name: "active", type: "boolean", optional: false },
    ]);
  });

  it("detects optional fields correctly", () => {
    const src = `interface Config { host: string; port?: number; }`;
    const r = parseInterfaces(src);
    expect(r[0].fields[0].optional).toBe(false);
    expect(r[0].fields[1].optional).toBe(true);
    expect(r[0].fields[1].type).toBe("number");
  });

  it("parses multiple interfaces in one source", () => {
    const src = `
      interface A { x: number; }
      interface B { y: string; z: boolean; }
    `;
    const result = parseInterfaces(src);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("A");
    expect(result[1].name).toBe("B");
    expect(result[1].fields).toHaveLength(2);
  });

  it("returns empty array when no interfaces exist", () => {
    expect(parseInterfaces("const x = 1;")).toEqual([]);
  });
});

describe("mapTypeToZod", () => {
  it("maps primitive types", () => {
    expect(mapTypeToZod("string")).toBe("z.string()");
    expect(mapTypeToZod("number")).toBe("z.number()");
    expect(mapTypeToZod("boolean")).toBe("z.boolean()");
    expect(mapTypeToZod("any")).toBe("z.any()");
  });

  it("maps array types", () => {
    expect(mapTypeToZod("string[]")).toBe("z.array(z.string())");
    expect(mapTypeToZod("number[]")).toBe("z.array(z.number())");
  });

  it("maps union types", () => {
    expect(mapTypeToZod("string | number")).toBe(
      "z.union([z.string(), z.number()])"
    );
  });

  it("maps unknown types to schema references", () => {
    expect(mapTypeToZod("Address")).toBe("AddressSchema");
  });
});

describe("generateGuards", () => {
  it("produces complete Zod schema output", () => {
    const ifaces = [
      {
        name: "User",
        fields: [
          { name: "id", type: "number", optional: false },
          { name: "email", type: "string", optional: true },
          { name: "tags", type: "string[]", optional: false },
        ],
      },
    ];
    const out = generateGuards(ifaces);
    expect(out).toContain('import { z } from "zod"');
    expect(out).toContain("export const UserSchema = z.object({");
    expect(out).toContain("id: z.number(),");
    expect(out).toContain("email: z.string().optional(),");
    expect(out).toContain("tags: z.array(z.string()),");
    expect(out).toContain(
      "export type UserGuarded = z.infer<typeof UserSchema>"
    );
  });

  it("end-to-end: parse then generate", () => {
    const src = `interface Order { total: number; note?: string; }`;
    const out = generateGuards(parseInterfaces(src));
    expect(out).toContain("OrderSchema");
    expect(out).toContain("total: z.number(),");
    expect(out).toContain("note: z.string().optional(),");
  });
});
