import { escapeCsv, parseCsvLine } from "@/lib/csv";

describe("escapeCsv", () => {
  it("returns value as-is when no special chars", () => {
    expect(escapeCsv("hello")).toBe("hello");
    expect(escapeCsv("John Doe")).toBe("John Doe");
  });

  it("wraps in quotes and escapes internal quotes when value contains comma", () => {
    expect(escapeCsv("Doe, John")).toBe('"Doe, John"');
  });

  it("escapes double quotes by doubling them", () => {
    expect(escapeCsv('Say "hello"')).toBe('"Say ""hello"""');
  });

  it("handles newlines and CR", () => {
    expect(escapeCsv("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("parseCsvLine", () => {
  it("splits simple comma-separated values", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted field with comma", () => {
    expect(parseCsvLine('"Doe, John",42')).toEqual(["Doe, John", "42"]);
  });

  it("handles escaped quotes inside quoted field", () => {
    expect(parseCsvLine('"Say ""hi"""')).toEqual(['Say "hi"']);
  });

  it("trims whitespace around unquoted values", () => {
    expect(parseCsvLine("  a  ,  b  ")).toEqual(["a", "b"]);
  });
});
