// Stub for @types/mapbox__point-geometry which ships without a .d.ts file
declare module '@mapbox/point-geometry' {
  export default class Point {
    x: number;
    y: number;
    constructor(x: number, y: number);
  }
}
