const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'node_modules', '@types', 'mapbox__point-geometry');
if (!fs.existsSync(dir)) process.exit(0);

const index = path.join(dir, 'index.d.ts');
if (!fs.existsSync(index)) {
  fs.writeFileSync(
    index,
    [
      'declare module "@mapbox/point-geometry" {',
      '  export default class Point {',
      '    x: number;',
      '    y: number;',
      '    constructor(x?: number, y?: number);',
      '  }',
      '}',
      'export {};',
      '',
    ].join('\n')
  );
  console.log('Patched @types/mapbox__point-geometry with index.d.ts');
}
