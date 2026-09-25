import { describe, expect, it } from "vitest";
import { createCapturePath, getSpriteSource, normalizedToCell } from "./grid";

describe("normalized coordinates to grid cell", () => {
  it("maps corners and center of a 7 × 7 grid", () => {
    expect(normalizedToCell(0, 0, 7, 7)).toEqual({ row: 0, column: 0 });
    expect(normalizedToCell(0.5, 0.5, 7, 7)).toEqual({ row: 3, column: 3 });
    expect(normalizedToCell(1, 1, 7, 7)).toEqual({ row: 6, column: 6 });
  });

  it("clamps out of range inputs", () => {
    expect(normalizedToCell(-2, 8, 7, 7)).toEqual({ row: 6, column: 0 });
    expect(normalizedToCell(5, -4, 7, 7)).toEqual({ row: 0, column: 6 });
  });

  it("supports other grid sizes", () => {
    expect(normalizedToCell(0.5, 0.5, 5, 9)).toEqual({ row: 2, column: 4 });
  });
});

it("calculates the sprite source rectangle", () => {
  expect(getSpriteSource({ row: 2, column: 4, frameWidth: 500, frameHeight: 500 }))
    .toEqual({ sourceX: 2000, sourceY: 1000 });
});

it("starts at center and visits every logical cell exactly once", () => {
  const path = createCapturePath(7, 7);
  expect(path).toHaveLength(49);
  expect(path[0]).toMatchObject({ row: 3, column: 3 });
  expect(new Set(path.map(({ row, column }) => `${row},${column}`)).size).toBe(49);
  for (let index = 1; index < path.length; index++) {
    const previous = path[index - 1];
    const current = path[index];
    expect(Math.abs(current.row - previous.row) + Math.abs(current.column - previous.column)).toBe(1);
  }
});
