// Minimal type definitions: zlibjs
declare module 'zlibjs/bin/gunzip.min.js' {
  namespace Zlib {
    class Gunzip {
        constructor(buffer: any);
        decompress();
   }
  }
}

// Minimal type definitions: three-gltf2-loader
declare module 'three-gltf2-loader/lib/main';


// Minimal type definitions: itowns
declare module 'itowns/dist/itowns' {

    export class Extent {
      /*@param {String} crs projection of limit values.
      * @param {number|Array.<number>|Coordinates|Object} v0 west value, zoom
      * value, Array of values [west, east, south and north], Coordinates of
      * west-south corner or object {west, east, south and north}
      * @param {number|Coordinates} [v1] east value, row value or Coordinates of
      * east-north corner
      * @param {number} [v2] south value or column value
      * @param {number} [v3] north value*/
        constructor(crs: string, v0?: number|number[]|object, v1?: number, v2?: number, v3?: number);
    }
    export class PlanarView {
        constructor(viewerDiv: HTMLElement, extent: Extent, params: any);
    }
    export class WMSSource {
        constructor(source: any);
    }
    export class ColorLayer {
        constructor(id: string, config: any);
    }

    import * as proj4 from 'proj4';
    export { proj4 };

    export class GLTFLoader {
        constructor(manager: any);
    }

    import * as THREE from 'three';
    export { THREE };

    export * from 'itowns';
    export const STRATEGY_DICHOTOMY: number;
}

declare module 'itowns/lib/Core/MainLoop' {
    export namespace MAIN_LOOP_EVENTS {
        const AFTER_CAMERA_UPDATE: string;
        const AFTER_LAYER_UPDATE: string;
        const AFTER_RENDER: string;
        const BEFORE_CAMERA_UPDATE: string;
        const BEFORE_LAYER_UPDATE: string;
        const BEFORE_RENDER: string;
        const UPDATE_END: string;
        const UPDATE_START: string;
    }
}
