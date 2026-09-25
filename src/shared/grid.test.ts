import { describe, expect, it } from "vitest";
import { createCapturePath, getSpriteSource, normalizePointerAroundPortrait, normalizedToCell } from "./grid";

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

describe("portrait-relative pointer mapping", () => {
  const rightPortrait = { left: 800, top: 200, width: 300, height: 300 };

  it("makes the portrait center neutral even when it sits on the right", () => {
    expect(normalizePointerAroundPortrait(950, 350, rightPortrait, 1200, 800)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizePointerAroundPortrait(950, 350, rightPortrait, 1200, 800).x)
      .not.toBe(950 / 1200);
  });

  it("uses the remaining space on both sides and clamps at viewport edges", () => {
    expect(normalizePointerAroundPortrait(0, 0, rightPortrait, 1200, 800)).toEqual({ x: 0, y: 0 });
    expect(normalizePointerAroundPortrait(1200, 800, rightPortrait, 1200, 800)).toEqual({ x: 1, y: 1 });
    expect(normalizePointerAroundPortrait(1100, 350, rightPortrait, 1200, 800).x).toBe(0.8);
    expect(normalizePointerAroundPortrait(1400, 350, rightPortrait, 1200, 800).x).toBe(1);
  });

  it("keeps the familiar mapping when the portrait is centered", () => {
    const centered = { left: 350, top: 250, width: 300, height: 300 };
    expect(normalizePointerAroundPortrait(250, 200, centered, 1000, 800)).toEqual({ x: 0.25, y: 0.25 });
  });
});

it.each([7, 13])("starts at center and visits every cell of a %i × %i grid once", (size) => {
  const path = createCapturePath(size, size);
  expect(path).toHaveLength(size * size);
  expect(path[0]).toMatchObject({ row: (size - 1) / 2, column: (size - 1) / 2 });
  expect(new Set(path.map(({ row, column }) => `${row},${column}`)).size).toBe(size * size);
  for (let index = 1; index < path.length; index++) {
    const previous = path[index - 1];
    const current = path[index];
    expect(Math.abs(current.row - previous.row) + Math.abs(current.column - previous.column)).toBe(1);
  }
});
