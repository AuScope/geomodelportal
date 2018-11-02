import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Most web servers & browsers will compress & decompress files if set up correctly,
// but for the moment this is required.
import { Zlib } from '../../../../node_modules/zlibjs/bin/gunzip.min.js';

// Include threejs library
import * as THREE from 'three';


// Different types of data available in a volume file
export enum DataType {BIT_MASK, INT_16, INT_8, FLOAT_16, FLOAT_32 }

@Injectable({
  providedIn: 'root'
})
export class VolviewService {

    // These are the X,Y,Z dimensions of the data in the volume
    private  X_DIM = 0;
    private  Y_DIM = 0;
    private  Z_DIM = 0;

    // For volumes which contain a bit mask data type, this is the length of the bit mask
    private  BIT_SZ = 0;

    // This is where the volume is placed in 3-D space
    private  ORIGIN = [0.0, 0.0, 0.0];

    // This is the size of the volume in space (X,Y,Z)
    private  CUBE_SZ = [0.0, 0.0, 0.0];

    // This is a colour loopkup table for the integer and bit mask volumes
    private colorLookup = {};

    // Is true if the DataType is 'BIT_MASK'
    private isBitField = false;

    // Stores the type of data within the volume
    private dataType: DataType = DataType.INT_16;

    // These arrays are used to view the data in different formats, using 'ab'  (below) as source
    private uint32View: Uint32Array;
    private uint8View: Uint8Array;
    private float32View: Float32Array;
    private volDataView: DataView;

    // Stores the data from within the volume
    private ab: ArrayBuffer;

    // ThreeJS scene object for the wireframe around the volume
    private wireFrObj: THREE.Object3D = null;


    constructor(private httpService: HttpClient) {
    }

    /**
     * Setup the parameters for the volume
     * @param dims dimensions of the data in the volume [X,Y,Z]
     * @param origin position of the volume in 3D space [X,Y,Z]
     * @param cubeSz size of the volume in 3D space [X,Y,Z]
     * @param dataType type of data that in within the volume
     * @param colourLut for volumes that contain integer or bit mask data, this is the colour { key: [R,G,B] }
     * @param bitSize for bit mask volumes this is the size of the bit mask
     */
    public setConfig(dims: [number, number, number], origin: [number, number, number], cubeSz: [number, number, number],
                   dataType: DataType, colourLut: any, bitSize: number) {
        if (dataType === DataType.BIT_MASK) {
            this.isBitField = true;
            this.BIT_SZ = bitSize;
        }
        this.X_DIM = dims[0];
        this.Y_DIM = dims[1];
        this.Z_DIM = dims[2];
        this.ORIGIN = origin;
        this.CUBE_SZ = cubeSz;
        this.colorLookup = colourLut;
        this.dataType = dataType;
        this.wireFrObj = this.makeWireFrame();
    }

    /**
     * Converts an integer to a 16-bit floating
     * @param val integer to be converted to float
     * @returns floating point number
     */
    private int_to_float16(val: number): number {
        // tslint:disable-next-line:no-bitwise
        const sign = (val & 0x8000) >> 15;
        // tslint:disable-next-line:no-bitwise
        const exp = (val & 0x7C00) >> 10;
        // tslint:disable-next-line:no-bitwise
        const frac = val & 0x03FF;

        if (exp === 0) {
            return (sign  ? -1 : 1) * Math.pow(2, -14) * (frac / Math.pow(2, 10));
        } else if (exp === 0x1F) {
            return frac ? NaN : ((sign ? -1 : 1) * Infinity);
        }
        return (sign  ? -1  : 1) * Math.pow(2, exp - 15) * (1 + (frac / Math.pow(2, 10)));
    }

    /**
     * Given an index into an array, this returns the value from the array, according to the volume's data type
     * @param idx integer index into array
     * @returns a value fetched from the array
     */
    private getFromArray(idx: number): number {
        switch (this.dataType) {
            case DataType.BIT_MASK:
                return this.uint32View[idx];

            case DataType.INT_16:
                // Big endian
                return this.volDataView.getUint16(idx * 2, false);

            case DataType.INT_8:
                return this.uint8View[idx];

            case DataType.FLOAT_16:
                return this.int_to_float16(this.volDataView.getUint16(idx * 2, true));

            case DataType.FLOAT_32:
                return this.float32View[idx];

        }
    }

    /**
     * Creates a promise that downloads a volume file an optionally draws the volume on screen
     * @param volUrl URL of the volume file
     * @param scene ThreeJS scene where it will be added
     * @param volObjList list of ThreeJS objects which make up the displayed volume
     * @param displayed if true then the volume should be added to scene and made visible, if false it is only added to the scene
     * @returns a promise
     */
    makePromise(volUrl: string, scene: THREE.Scene, volObjList: THREE.Object3D[], displayed: boolean): Promise<any> {
        const local = this;
        return new Promise( function( resolve, reject ) {
            local.httpService.get(volUrl, { responseType: 'arraybuffer' }).subscribe(
                function (data) {
                    const volResult = data;
                    // If the web server is set up to compress files, then most browsers will decompress
                    // automatically. In future, this step may not be necessary.
                    const gunzip = new Zlib.Gunzip(new Uint8Array(volResult));
                    const plain = gunzip.decompress();
                    local.ab = new ArrayBuffer(plain.byteLength);
                    local.uint8View = new Uint8Array(local.ab);
                    for (let ii = 0; ii < plain.byteLength; ii++) {
                        local.uint8View[ii] =  plain[ii];
                    }
                    switch (local.dataType) {
                        case DataType.BIT_MASK:
                            local.uint32View = new Uint32Array(local.ab);
                        break;
                        case DataType.INT_16:
                        case DataType.FLOAT_16:
                            // Big endian integers need a different technique
                            local.volDataView = new DataView(local.ab);
                        break;
                        case DataType.FLOAT_32:
                            local.float32View = new Float32Array(local.ab);
                        break;
                    }
                    const objList = local.makeSlices([0.0, 0.0, 0.0], [null, null, null], displayed);
                    for (const object of objList) {
                        scene.add(object);
                        volObjList.push(object);
                    }

                    // Add wireframe
                    scene.add(local.wireFrObj);
                    volObjList.push(local.wireFrObj);

                    resolve(objList);
                }, function (err) {
                    console.error('Cannot load volume', err);
                    reject(err);
                });
        });
    }

    /**
     * Extracts the bits from an integer bit mask
     * @param val integer bit mask
     * @param max integer size of bit mask
     * @returns a list of integers, one for the position of each bit in the bit mask
     */
    private getBitFields(val: number, max: number): number[] {
        let mask = val;
        const retList = [];
        for (let i = 0; i < max; i++) {
            // tslint:disable-next-line:no-bitwise
            if ((mask & 1) === 1) {
                retList.push(i);
            }
            // tslint:disable-next-line:no-bitwise
            mask = mask >> 1;
        }
        return retList;
    }

    /**
     * Fetches a value from within a volume, given three coordinates and a dimension number.
     * The dimension number indicates which slice is being fetched.
     * @param dimIdx integer dimension index, 0 = x dimension, 1 = y dimension, 2 = z dimension
     * @param u,v,w three coordinates, u is the same dimension as the slice, v,w are the other two dimensions
     * @returns -1 if cannot find value
     */
    private getValueXYZ(dimIdx, u, v, w: number): number {
        let x = 0, y = 0, z = 0;
        switch (dimIdx) {
            case 0:
                x = u;
                z = w;
                y = v;
                break;
            case 1:
                y = u;
                x = v;
                z = w;
                break;
            case 2:
                z = u;
                x = w;
                y = v;
        }
        if (x > this.X_DIM || y > this.Y_DIM || z > this.Z_DIM) {
            console.error('E!', dimIdx, u, v, w, this.X_DIM, this.Y_DIM, this.Z_DIM, x, y, z);
        }
        const val = this.getFromArray(x + y * this.X_DIM + z * this.X_DIM * this.Y_DIM);

        if (this.isBitField) {
            const valArr = this.getBitFields(val, this.BIT_SZ);
            if (valArr.length > 0) {
                return valArr[valArr.length - 1];
            }
        } else {
            return val;
        }
        return -1;
    }

    /**
     * Makes a wire frame model to hold the volume
     */
    public makeWireFrame(): THREE.Object3D {
        const material = new THREE.MeshBasicMaterial({ wireframe: true });
        const geometry = new THREE.BoxBufferGeometry(this.CUBE_SZ[0], this.CUBE_SZ[1], this.CUBE_SZ[2]);
        const object = new THREE.Mesh( geometry, material );
        for (let comp = 0; comp < 3; comp++) {
            object.position.setComponent(comp, this.ORIGIN[comp] + this.CUBE_SZ[comp] / 2.0);
        }
        return object;
    }

    /**
     * Given one dimension, returns the data sizes of other two dimemnsions.
     * e.g. getOtherDims(1) returns size of x-dimension & y-dimension.
     * @param idx integer dimension index, 0 = x dimension, 1 = y dimension, 2 = z dimension
     * @returns data size in the other two dimensions [number, number]
     */
    private getOtherDimSz(idx: number): number[] {
        switch (idx) {
            case 0:
                return [this.Z_DIM, this.Y_DIM];
            case 1:
                return [this.X_DIM, this.Z_DIM];
            case 2:
                return [this.X_DIM, this.Y_DIM];
        }
        return [];
    }

    /**
     * Returns the data size of the dimension
     * @param idx integer dimension index, 0 = x dimension, 1 = y dimension, 2 = z dimension
     * @returns the data size of the dimension
     */
    private getDimSize(idx: number): number {
        switch (idx) {
            case 0:
                return this.X_DIM;
            case 1:
                return this.Y_DIM;
            case 2:
                return this.Z_DIM;
        }
        return 0;
    }

    /**
     * Given one dimension, returns the sizes of 3d volume in the other two dimemnsions.
     * e.g. getOtherVolSzs(1) returns size of 3d volume in x-dimension & y-dimension.
     * @param idx integer dimension index, 0 = x dimension, 1 = y dimension, 2 = z dimension
     * @returns size of 3d volume in the other two dimensions [number, number]
     */
    private getOtherVolSzs(idx: number): number[] {
        switch (idx) {
            case 0:
                return [this.CUBE_SZ[1], this.CUBE_SZ[2]];
            case 1:
                return [this.CUBE_SZ[0], this.CUBE_SZ[2]];
            case 2:
                return [this.CUBE_SZ[1], this.CUBE_SZ[0]];
        }
        return [];
    }

    /**
     *
     */
    public changePosition(sceneObj: THREE.Object3D, displacement: THREE.Vector3) {
        if (!sceneObj.userData.hasOwnProperty('origPosition')) {
            sceneObj.userData.origPosition = sceneObj.position.clone();
        }
        sceneObj.position.addVectors(sceneObj.userData.origPosition, displacement);
        this.ORIGIN[0] += displacement.x;
        this.ORIGIN[1] += displacement.y;
        this.ORIGIN[2] += displacement.z;
    }

    /**
     * Moves and optionally creates the three slices (X,Y,Z) within the volume
     * @param pctList list of three float values, (0.0..1.0) indicating the position of each slice within the volume.
     * @param objectList list of ThreeJS objects which represent the three slices & wireframe
     * [X-slice, Y-slice, Z-slice, wireframe]
     * If X-slice or Y-slice or Z-slice is null then a new slice is created
     * @param displayed if creating a new slice, will it be visible or not
     */
    public makeSlices(pctList: [number, number, number], objectList: THREE.Object3D[], displayed: boolean) {
        // Make one slice for each dimension
        for (let dimIdx = 0; dimIdx < pctList.length; dimIdx++) {
            let newSlice = false;
            if (pctList[dimIdx] !== -1.0) {
                // Make sure position is within 0.0 to 1.0
                if (pctList[dimIdx] < 0.0) {
                    pctList[dimIdx] = 0.0;
                } else if (pctList[dimIdx] > 1.0) {
                    pctList[dimIdx] = 1.0;
                }
                // Set up dimensional translations
                const otherDimSzList = this.getOtherDimSz(dimIdx);
                const dimSz = this.getDimSize(dimIdx);
                const otherVolSzList = this.getOtherVolSzs(dimIdx);

                // Calculate position of slice along its dimension, in 3d space
                const disp  = Math.floor(pctList[dimIdx] * this.CUBE_SZ[dimIdx]);

                // Calculate position of slice within the data volume
                const idx  = Math.floor(pctList[dimIdx] * dimSz);

                // Set up a buffer to hold slice
                const rgbBuffer = new ArrayBuffer(3 * otherDimSzList[0] * otherDimSzList[1]);
                // Set up array to view the buffer
                const dataRGB = new Uint8Array(rgbBuffer);
                let cntr = 0;
                // Loop over the other two dimensions, creating a planar slice at the current position
                for (let d1 = 0; d1 < otherDimSzList[0]; d1++) {
                    for (let d2 = 0; d2 < otherDimSzList[1]; d2++) {

                        // create a buffer with color data
                        const v = this.getValueXYZ(dimIdx, idx, d2, d1);
                        if (v > 0 && this.colorLookup[v]) {
                            dataRGB[cntr * 3] = Math.floor(256.0 * this.colorLookup[v][0]);
                            dataRGB[cntr * 3 + 1] = Math.floor(256.0 * this.colorLookup[v][1]);
                            dataRGB[cntr * 3 + 2] = Math.floor(256.0 * this.colorLookup[v][2]);
                        }
                        cntr++;
                    }
                }
                // Using the 2D data in ArrayBuffer create a texture which is mapped to a material
                const texture = new THREE.DataTexture( dataRGB, otherDimSzList[1], otherDimSzList[0], THREE.RGBFormat );
                texture.needsUpdate = true;
                const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                // If required, create a new plane covered by the material
                if (objectList[dimIdx] === null) {
                    newSlice = true;
                    const geometry = new THREE.PlaneBufferGeometry(otherVolSzList[0], otherVolSzList[1]);
                    objectList[dimIdx] = new THREE.Mesh( geometry, material );
                    objectList[dimIdx].visible = displayed;
                    const rot = new THREE.Euler(0.0, 0.0, 0.0);
                    switch (dimIdx) {
                        case 0:
                            rot.y = Math.PI / 2.0;
                            rot.x = Math.PI / 2.0;
                            break;
                        case 1:
                             rot.x = Math.PI / 2.0;
                             break;
                        case 2:
                             rot.z = - Math.PI / 2.0;
                             rot.x =  Math.PI;
                             break;
                    }
                    objectList[dimIdx].rotation.copy(rot);
                } else {
                    // If plane already exists, then just change its material, keeping old opacity
                    const  oldMaterial = (<THREE.MeshBasicMaterial>(<THREE.Mesh> objectList[dimIdx]).material);
                    material.opacity = oldMaterial.opacity;
                    material.transparent = oldMaterial.transparent;
                    (<THREE.Mesh> objectList[dimIdx]).material = material;
                }

                // Create a new slice
                if (newSlice) {
                    // Set up base position of volume
                    for (let comp = 0; comp < 3; comp++) {
                        if (comp !== dimIdx) {
                            objectList[dimIdx].position.setComponent(comp, this.ORIGIN[comp] + this.CUBE_SZ[comp] / 2.0);
                        } else {
                            objectList[dimIdx].position.setComponent(comp, this.ORIGIN[comp]);
                        }
                    }
                    objectList[dimIdx].userData.baseSlicePosition = objectList[dimIdx].position.clone();

                    // Add in initial displacement
                    const sliceDisp = new THREE.Vector3(0.0, 0.0, 0.0);
                    sliceDisp.setComponent(dimIdx, disp);
                    objectList[dimIdx].userData.sliceDisplacement = sliceDisp;
                    objectList[dimIdx].position.add(sliceDisp);
                }

                // Fetch base position
                const basePosition: THREE.Vector3 = objectList[dimIdx].userData.baseSlicePosition.clone();
                // Fetch old slice displacement
                const oldDisp = objectList[dimIdx].userData.sliceDisplacement;
                const currentPosition: THREE.Vector3 = objectList[dimIdx].position.clone();
                // Calculate new slice displacement
                const newDisp = new THREE.Vector3(0.0, 0.0, 0.0);
                newDisp.setComponent(dimIdx, disp);

                // Adjust position of slice
                const newPosition = currentPosition.sub(oldDisp).add(newDisp);
                objectList[dimIdx].position.copy(newPosition);

                // Store the new 'origPosition' for the height slider to use and new slice displacement
                objectList[dimIdx].userData.origPosition = basePosition.add(newDisp);
                objectList[dimIdx].userData.sliceDisplacement = newDisp;
            }
        }
        return objectList;
    }

}
