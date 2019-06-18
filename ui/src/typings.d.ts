/* SystemJS module definition */
declare var module: NodeModule;
interface NodeModule {
    id: string;
}

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
    import * as _THREE from 'three';
    import * as _Proj4 from 'proj4';
    class Extent {
      /*@param {String} crs projection of limit values.
      * @param {number|Array.<number>|Coordinates|Object} v0 west value, zoom
      * value, Array of values [west, east, south and north], Coordinates of
      * west-south corner or object {west, east, south and north}
      * @param {number|Coordinates} [v1] east value, row value or Coordinates of
      * east-north corner
      * @param {number} [v2] south value or column value
      * @param {number} [v3] north value*/
        constructor(crs: string, v0?: number|number[]|Coordinates|Object, v1?: number|Coordinates, v2?: number, v3?: number);
    }
    class PlanarView {
        constructor(viewerDiv, extent: Extent, params);
    }
    namespace proj4 {
        // Re-export definitions from 'proj4'
        export import defs = _Proj4.defs;
    }
    const STRATEGY_DICHOTOMY;
    namespace THREE {
        // Re-export definitions from 'three'
        export import Scene = _THREE.Scene;
        export import Vector3 = _THREE.Vector3;
        export import Object3D = _THREE.Object3D;
        export import MeshBasicMaterial = _THREE.MeshBasicMaterial;
        export import Mesh = _THREE.Mesh;
        export import BoxBufferGeometry = _THREE.BoxBufferGeometry;
        export import DataTexture = _THREE.DataTexture;
        export import PlaneBufferGeometry = _THREE.PlaneBufferGeometry;
        export import RGBAFormat = _THREE.RGBAFormat;
        export import DoubleSide = _THREE.DoubleSide;
        export import Color = _THREE.Color;
        export import Vector2 = _THREE.Vector2;
        export import Cache = _THREE.Cache;
        export import LoadingManager = _THREE.LoadingManager;
        export import Euler = _THREE.Euler;
        export import AmbientLight = _THREE.AmbientLight;
        export import PointLight = _THREE.PointLight;
        export import Texture = _THREE.Texture;
        export import Sprite = _THREE.Sprite;
        export import SpriteMaterial = _THREE.SpriteMaterial;
        export import TextureLoader = _THREE.TextureLoader;
        export import LinearFilter = _THREE.LinearFilter;
        export import PlaneGeometry = _THREE.PlaneGeometry;
        export import Raycaster = _THREE.Raycaster;
        export import Material = _THREE.Material;
        export import BufferGeometry = _THREE.BufferGeometry;
    }
}

declare module 'itowns/lib/Core/MainLoop' {
    export namespace MAIN_LOOP_EVENTS {
        const AFTER_CAMERA_UPDATE;
    }
}
