import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Most web servers & browsers will compress & decompress files if set up correctly,
// but for the moment this is required.
import { Zlib } from '../../../../node_modules/zlibjs/bin/gunzip.min.js';

// Include threejs library
import * as THREE from 'three';

// Import itowns library
// Note: In ThreeJS, buffer geometry ids are created by incrementing a counter which is local to the library.
// So when creating objects to be added to the scene, we must always use ITOWNS' version of ThreeJS.
// If we do not do this, there will be an overlap in ids and objects are not reliably rendered to screen.
// FIXME: Needs typescript bindings
import * as ITOWNS from '../../../../node_modules/itowns/dist/itowns';


// Different types of data available in a volume file
export enum DataType {BIT_MASK, INT_16, INT_8, FLOAT_16, FLOAT_32 }

export const VOL_LABEL_PREFIX = 'Volume3D_';

// Volume services
export class VolView {
    // These are the X,Y,Z dimensions of the data in the volume
    DIM: [number, number, number] = [0.0, 0.0, 0.0];

    // For volumes which contain a bit mask data type, this is the length of the bit mask
    BIT_SZ = 0;

    // This is where the volume is placed in 3-D space
    ORIGIN: [number, number, number] = [0.0, 0.0, 0.0];

    // This is the size of the volume in space (X,Y,Z)
    CUBE_SZ: [number, number, number] = [0.0, 0.0, 0.0];

    // These are the local X,Y,Z axes (unit length) of the volume, used to set the rotation of volume
    // I am assuming that these are perpendicular
    ORIENTATION: [ THREE.Vector3, THREE.Vector3, THREE.Vector3 ] = [ new THREE.Vector3(1, 0, 0),
                                                                  new THREE.Vector3(0, 1, 0),
                                                                  new THREE.Vector3(0, 0, 1) ];

    // This is a colour loopkup table for the integer and bit mask volumes
    colorLookup: { [idx: number]: [number, number, number] } = {};

    // Is true if the DataType is 'BIT_MASK'
    isBitField = false;

    // Stores the type of data within the volume
    dataType: DataType = DataType.INT_16;

    // These arrays are used to view the data in different formats, using 'ab'  (below) as source
    uint32View: Uint32Array;
    uint8View: Uint8Array;
    dataView: DataView;

    // Stores the data from within the volume
    ab: ArrayBuffer;

    // ThreeJS scene object for the wireframe around the volume
    wireFrObj: THREE.Object3D = null;

    // Min and max values, must be supplied when no colour lookup table is supplied
    maxVal = 0;
    minVal = 0;
}

@Injectable({
  providedIn: 'root'
})
export class VolviewService {

    constructor(private httpService: HttpClient) {
    }

    /**
     * Setup the parameters for the volume
     * @param volDataObj JSON object taken from model config file
     * @param dataType type of data that in within the volume
     */
    public makeVolView(volDataObj: {}, dataType: DataType): VolView {
        const dims = volDataObj['dataDims'];
        const volView = new VolView();
        if (dataType === DataType.BIT_MASK) {
            volView.isBitField = true;
            volView.BIT_SZ = volDataObj['bitSize'];
        }
        volView.ORIGIN = volDataObj['origin'];
        volView.CUBE_SZ = volDataObj['size'];
        for (let d = 0; d < 3; d++) {
            volView.ORIENTATION[d] = new THREE.Vector3(volDataObj['rotation'][d][0], volDataObj['rotation'][d][1],
                                                                                  volDataObj['rotation'][d][2] );
            volView.DIM[d] = dims[d];
        }
        volView.colorLookup = volDataObj['colourLookup'];
        volView.dataType = dataType;
        volView.maxVal = volDataObj['maxVal'];
        volView.minVal = volDataObj['minVal'];
        volView.wireFrObj = this.makeWireFrame(volView);
        return volView;
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
     * Converts an integer to a 32-bit floating
     * @param val integer to be converted to float
     * @returns floating point number
     */
    public int_to_float32(val) {
        // tslint:disable-next-line:no-bitwise
        const sign = (val & 0x80000000) >> 31;
        // tslint:disable-next-line:no-bitwise
        const exp = (val & 0x7F800000) >> 23;
        // tslint:disable-next-line:no-bitwise
        const frac = val & 0x07FFFFF;

        if (exp === 0) {
            return (sign  ? -1 : 1) * (frac / Math.pow(2, 23));
        } else if (exp === 0xFF) {
            return frac ? NaN : ((sign ? -1 : 1) * Infinity);
        }
        return (sign  ? -1  : 1) * Math.pow(2, (exp - 127)) * (1 + (frac / Math.pow(2, 23)));
    }

    /**
     * Given an index into an array, this returns the value from the array, according to the volume's data type
     * It is assumed that the int and float data is big endian.
     * @param idx integer index into array
     * @returns a value fetched from the array or null upon error
     */
    private getFromArray(volView: VolView, idx: number): number | null {
        try {
            switch (volView.dataType) {
                case DataType.BIT_MASK:
                    return volView.uint32View[idx];

                case DataType.INT_16:
                    // Big endian
                    if (idx * 2 >= volView.dataView.byteLength - 2) {
                        return volView.dataView.getUint16(volView.dataView.byteLength - 2, false);
                    } else if (idx < 0 ) {
                        return volView.dataView.getUint16(0, false);
                    }
                    return volView.dataView.getUint16(idx * 2, false);

                case DataType.INT_8:
                    return volView.uint8View[idx];

                case DataType.FLOAT_16:
                    // Javascript 'DataView' does not have 'getFloat16()'
                    return this.int_to_float16(volView.dataView.getUint16(idx * 2, false));

                case DataType.FLOAT_32:
                    // Big endian
                    return volView.dataView.getFloat32(idx * 4, false);
            }
        } catch (err) {
            // console.log(err);
        }
        return null;
    }

    /**
     * Creates a promise that downloads a volume file an optionally draws the volume on screen
     * @param volFile filename of volume file
     * @param volUrl URL of the volume file
     * @param scene ThreeJS scene where it will be added
     * @param volObjList list of ThreeJS objects which make up the displayed volume
     * @param displayed if true then the volume should be added to scene and made visible, if false it is only added to the scene
     * @returns a promise
     */
    public makePromise(volView: VolView, groupName: string, partId: string, volUrl: string, scene: THREE.Scene,
                volObjList: THREE.Object3D[], displayed: boolean): Promise<any> {
        const local = this;
        return new Promise( function( resolve, reject ) {
            local.httpService.get(volUrl, { responseType: 'arraybuffer' }).subscribe(
                function (data) {
                    const volResult = data;
                    // If the web server is set up to compress files, then most browsers will decompress
                    // automatically. In future, this step may not be necessary.
                    const gunzip = new Zlib.Gunzip(new Uint8Array(volResult));
                    const plain = gunzip.decompress();
                    volView.ab = new ArrayBuffer(plain.byteLength);
                    volView.uint8View = new Uint8Array(volView.ab);
                    for (let ii = 0; ii < plain.byteLength; ii++) {
                        volView.uint8View[ii] =  plain[ii];
                    }
                    switch (volView.dataType) {
                        case DataType.BIT_MASK:
                            volView.uint32View = new Uint32Array(volView.ab);
                            break;
                        case DataType.INT_16:
                        case DataType.FLOAT_16:
                        case DataType.FLOAT_32:
                            // Big endian integers & floats need a different technique
                            volView.dataView = new DataView(volView.ab);
                            break;
                    }
                    const objList = local.makeSlices(volView, groupName, partId, [0.0, 0.0, 0.0], [null, null, null], displayed);
                    for (const object of objList) {
                        scene.add(object);
                        volObjList.push(object);
                    }

                    // Add wireframe
                    volView.wireFrObj.visible = displayed;
                    scene.add(volView.wireFrObj);
                    volObjList.push(volView.wireFrObj);

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
     * Makes a wire frame model to hold the volume
     * @param volView volume data
     * @returns a ThreeJS object
     */
    private makeWireFrame(volView: VolView): THREE.Object3D {
        const material = new ITOWNS.THREE.MeshBasicMaterial({ wireframe: true });
        const geometry = new ITOWNS.THREE.BoxBufferGeometry(volView.CUBE_SZ[0], volView.CUBE_SZ[1], volView.CUBE_SZ[2]);
        const object = new ITOWNS.THREE.Mesh( geometry, material );
        for (let comp = 0; comp < 3; comp++) {
            object.position.setComponent(comp, volView.ORIGIN[comp]
               + volView.ORIENTATION[comp].getComponent(comp) * volView.CUBE_SZ[comp] / 2.0);
        }
        return object;
    }


    /**
     * Creates a volume label
     * @param groupName name of group, string
     * @param partID part id string
     * @returns volume label, string
     */
    private makeVolLabel(groupName: string, partId: string) {
        return VOL_LABEL_PREFIX + '|' + groupName + '|' + partId;
    }


    /**
     * Splits volume label into components
     * @param volLabel volume label, string
     * @returns [group name string, part id string]
     */
    public parseVolLabel(volLabel: string): [string, string] {
        const strArr = volLabel.split('|');
        return [strArr[1], strArr[2]];
    }

    /**
     * Returns true if label string refers to a volume label
     * @returns true if it is a volume label string
     */
    public isVolLabel(volLabel: string): boolean {
        return (volLabel.substring(0, 9) === VOL_LABEL_PREFIX);
    }

    /**
     * Places a four byte RGBA tuple into a byte array, given volume data
     * @param x,y,z X,Y,Z coordinates
     * @param volView container of volume data
     * @param dataRGBA output byte array
     * @param idx index into each RGBA tuple within dataRBGA
     */
    private layoutRGBA(x: number, y: number, z: number, volView: VolView, dataRGBA: Uint8Array, idx: number) {

        // Create a buffer with color data
        let val = this.getFromArray(volView, x + y * volView.DIM[0] + z * volView.DIM[0] * volView.DIM[1]);
        if (val !== null) {
            if (volView.isBitField) {
                const valArr = this.getBitFields(val, volView.BIT_SZ);
                if (valArr.length === 0) {
                    return;
                }
                val = valArr[valArr.length - 1];
            }
            if (volView.colorLookup && volView.colorLookup.hasOwnProperty(val)) {
                dataRGBA[idx * 4] = Math.floor(256.0 * volView.colorLookup[val][0]);
                dataRGBA[idx * 4 + 1] = Math.floor(256.0 * volView.colorLookup[val][1]);
                dataRGBA[idx * 4 + 2] = Math.floor(256.0 * volView.colorLookup[val][2]);
                dataRGBA[idx * 4 + 3] = Math.floor(255.0);
            } else {
                // If no colour data then use greyscale
                const bwTuple = this.bwLookup(volView, val);
                dataRGBA[idx * 4] = Math.floor(255.99 * bwTuple[0]);
                dataRGBA[idx * 4 + 1] = Math.floor(255.99 * bwTuple[1]);
                dataRGBA[idx * 4 + 2] = Math.floor(255.99 * bwTuple[2]);
                dataRGBA[idx * 4 + 3] = Math.floor(255.99 * bwTuple[3]);
            }
        }
    }

    /**
     * Moves and optionally creates the three slices (X,Y,Z) within the volume
     * @param volView the volume's 'VolView' object
     * @param groupName name of volumes' group, string
     * @param partId volume's part id, string
     * @param pctList list of three float values, (0.0..1.0) indicating the position of each slice within the volume.
     * @param objectList list of ThreeJS objects which represent the three slices & wireframe
     * [X-slice, Y-slice, Z-slice, wireframe]
     * If X-slice or Y-slice or Z-slice is null then a new slice is created
     * @param displayed if creating a new slice, will it be visible or not
       NB: This is not complete, it only works for ORIENTATION axes which are parallel or antiparallel to XYZ,
        and only one axis can be antiparallel.
       TODO: Make it more general cope with any ORIENTATION
     */
    public makeSlices(volView: VolView, groupName: string, partId: string, pctList: [number, number, number],
                       objectList: THREE.Object3D[], displayed: boolean) {

        // Check for inverted axes
        const inverted = [false, false, false];
        let needsInvert = false;
        for (let vDim = 0; vDim < 3; vDim++) {
            const u = new THREE.Vector3();
            u.setComponent(vDim, 1.0);
            // Is an axis inverted?
            const uVec = new THREE.Vector3();
            uVec.setComponent(vDim, 1.0);
            if (volView.ORIENTATION[vDim].angleTo(uVec) > Math.PI / 2.0) {
                inverted[vDim] = true;
                needsInvert = true;
            }
        }
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
                let d1, d2;
                switch (dimIdx) {
                    case 0:
                        d1 = 1, d2 = 2;
                        break;
                    case 1:
                        d1 = 0, d2 = 2;
                        break;
                    case 2:
                        d1 = 0, d2 = 1;
                }
                // Set up a buffer to hold slice
                const rgbaBuffer = new ArrayBuffer(4 * volView.DIM[d1] * volView.DIM[d2]);
                // Set up array to view the buffer
                const dataRGBA = new Uint8Array(rgbaBuffer);
                let cntr = 0;
                const l0  = Math.floor(pctList[dimIdx] * volView.DIM[dimIdx]);
                // Loop over Y,Z or X,Z  or X,Y
                for (let l1 = 0; l1 < volView.DIM[d1]; l1++) {
                    for (let l2 = 0; l2 < volView.DIM[d2]; l2++) {
                        // Create a buffer with color data
                        switch (dimIdx) {
                            case 0:
                                this.layoutRGBA(l0, l1, l2, volView, dataRGBA, cntr);
                                break;
                            case 1:
                                this.layoutRGBA(l1, l0, l2, volView, dataRGBA, cntr);
                                break;
                            case 2:
                                this.layoutRGBA(l1, l2, l0, volView, dataRGBA, cntr);
                        }
                        cntr++;
                    }
                }

                // Using the 2D data in ArrayBuffer create a texture which is mapped to a material
                const texture = new ITOWNS.THREE.DataTexture( dataRGBA, volView.DIM[d2], volView.DIM[d1], ITOWNS.THREE.RGBAFormat );
                texture.needsUpdate = true;
                const material = new ITOWNS.THREE.MeshBasicMaterial({ map: texture, side: ITOWNS.THREE.DoubleSide, transparent: true });
                // If required, create a new plane covered by the material
                if (objectList[dimIdx] === null) {
                    newSlice = true;
                    const geometry = new ITOWNS.THREE.PlaneBufferGeometry(volView.CUBE_SZ[d2], volView.CUBE_SZ[d1]);
                    // Assumes orientation vectors are perpendicular
                    geometry.lookAt(volView.ORIENTATION[dimIdx]);
                    switch (dimIdx) {
                        case 0:
                            geometry.rotateY(Math.PI);
                            break;
                        case 1:
                            geometry.rotateY(- Math.PI / 2.0);
                            break;
                        case 2:
                            geometry.rotateZ( - Math.PI  / 2.0);
                            geometry.rotateX(Math.PI);
                            break;
                    }
                    if (needsInvert) {
                        if (!inverted[dimIdx]) {
                            switch (dimIdx) {
                                case 0:
                                    if (inverted[1]) {
                                        geometry.rotateZ(Math.PI);
                                    } else if (inverted[2]) {
                                        geometry.rotateY(Math.PI);
                                    }
                                    break;
                                case 1:
                                    if (inverted[0]) {
                                        geometry.rotateZ(Math.PI);
                                    } else if (inverted[2]) {
                                        geometry.rotateX(Math.PI);
                                    }
                                    break;
                                case 2:
                                    if (inverted[1]) {
                                        geometry.rotateX(Math.PI);
                                    } else if (inverted[0]) {
                                        geometry.rotateY(Math.PI);
                                    }
                                    break;
                            }
                        } else {
                            switch (dimIdx) {
                                case 0:
                                    geometry.rotateY(Math.PI);
                                    break;
                                case 1:
                                    geometry.rotateZ(Math.PI);
                                    break;
                                case 2:
                                    geometry.rotateX(Math.PI);
                                    break;
                            }
                        }
                    }
                    objectList[dimIdx] = new ITOWNS.THREE.Mesh(geometry, material);
                    objectList[dimIdx].visible = displayed;
                    objectList[dimIdx].name = this.makeVolLabel(groupName, partId);

                } else {
                    // If plane already exists, then just change its material, keeping old opacity
                    const  oldMaterial = (<ITOWNS.THREE.MeshBasicMaterial>(<ITOWNS.THREE.Mesh> objectList[dimIdx]).material);
                    material.opacity = oldMaterial.opacity;
                    material.transparent = oldMaterial.transparent;
                    (<ITOWNS.THREE.Mesh> objectList[dimIdx]).material = material;
                }

                // Calculate position of slice along its dimension, in 3d space
                // If the volume is upside down, then slice moves in the opposite direction
                let offset = pctList[dimIdx];
                if (inverted[dimIdx]) {
                    offset = 1.0 - offset;
                }
                const disp  = Math.floor(offset * volView.CUBE_SZ[dimIdx]);

                // Create a new slice
                if (newSlice) {
                    // Set up base position of each slice, using centre point of slice as reference point for positioning,
                    // orientation determines direction relative to origin
                    for (let comp = 0; comp < 3; comp++) {
                        if (comp !== dimIdx) {
                            objectList[dimIdx].position.setComponent(comp, volView.ORIGIN[comp] +
                              volView.ORIENTATION[comp].getComponent(comp) * volView.CUBE_SZ[comp] / 2.0);
                        } else {
                            let invOrientOffset = 0.0;
                            if (volView.ORIENTATION[comp].getComponent(comp) < 0.0) {
                                invOrientOffset = volView.CUBE_SZ[comp];
                            }
                            objectList[dimIdx].position.setComponent(comp, volView.ORIGIN[comp] - invOrientOffset);
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

    /**
     * Create a black & white colour table lookup for volumes with no colour data.
     * @param volView the volume's 'VolView' object
     * @param val the value to convert to a black & white colour
     * @returns [R, G, B, A] numbers
     */
    private bwLookup(volView, val): [number, number, number, number] {
        if (volView.minVal === volView.maxVal) {
            return [ 0.5, 0.5, 0.5, 1.0 ];
        }
        let normVal = (val - volView.minVal) / (volView.maxVal - volView.minVal);
        if (normVal > 1.0) {
            normVal = 1.0;
        // If less than normal, then render as transparent
        } else if (normVal < 0.0) {
            return [ 0.0, 0.0, 0.0, 0.0 ];
        }
        return [ normVal, normVal, normVal, 1.0];
    }

    /**
     * Given (X,Y,Z) real world coords and a slice index, it returns the volume's value at that point
     * @param xyz ThreeJS vector of the point on the slice
     * @returns a numeric value, or null of no value found
     */
    public xyzToProp(volView: VolView, xyz: THREE.Vector3): number  | null {

        const dx = Math.floor((xyz.x - volView.ORIGIN[0]) / volView.CUBE_SZ[0] * volView.DIM[0]); // X
        const dy = Math.floor((xyz.y - volView.ORIGIN[1]) / volView.CUBE_SZ[1] * volView.DIM[1]); // Y
        const dz = Math.floor((xyz.z - volView.ORIGIN[2]) / volView.CUBE_SZ[2] * volView.DIM[2]); // Z
        return this.getFromArray(volView, dx + dy * volView.DIM[0] + dz * volView.DIM[0] * volView.DIM[1]);
    }
}
