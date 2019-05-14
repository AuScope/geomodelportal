import * as THREE from 'three';

import { VolView, VolviewService } from '../../shared/services/volview.service';

/**
 * This class is used to manipulate graphical objects in a scene
 * The 'SceneObject' class is used to manipulate GLTF Objects
 */
export class SceneObject {
    public sceneObj: any;

    /**
     * Creates 'SceneObj' class
     * @param sceneObj object to be loaded into the scene
     */
    constructor(sceneObj: any) {
        this.sceneObj = sceneObj;
    }

    /**
     * Sets visibility of scene object
     * @param visibility boolean
     */
    public setVisibility(visibility: boolean) {
        this.sceneObj.visible = visibility;
    }

    /**
     * Sets transparency of scene object
     * @param transparency number (0..1)
     */
    public setTransparency(transparency: number) {
        const local = this;
        this.sceneObj.traverseVisible( function(child) {
            if (child.type === 'Mesh' && child.hasOwnProperty('material')) {
                if (child['material'].type === 'MeshStandardMaterial') {
                    local.setMatTransparency(child['material'], transparency);
                }
            }
        });
    }

    /**
      * Generic routine to change the transparency of materials
      * @param material ThreeJS material object
      * @param transparency number (0..1)
      */
    protected setMatTransparency(material: THREE.Material, transparency: number) {
        if (transparency >= 0.0 && transparency < 1.0) {
            material.transparent = true;
            material.opacity = transparency;
        } else if (transparency === 1.0) {
            material.transparent = false;
            material.opacity = 1.0;
        }
    }

    /**
     * Generic routine to change the displacement (move) an object in a 3d graphical scene
     * @param obj ThreeJS object
     * @param displacement ThreeJS 3d displacement vector
     */
    protected setObjDisplacement(obj: THREE.Object3D, displacement: THREE.Vector3) {
        if (!obj.userData.hasOwnProperty('origPosition')) {
            obj.userData.origPosition = obj.position.clone();
        }
        obj.position.addVectors(obj.userData.origPosition, displacement);
    }

    /**
     * Sets displacement of scene object
     * @param 3d vector displacement
     */
    public setDisplacement(displacement: THREE.Vector3) {
        // Move GLTF object
        let found = false;
        const local = this;
        this.sceneObj.traverseVisible( function(child) {
            if (!found && child.type === 'Object3D') {
                local.setObjDisplacement(child, displacement);
                found = true;
            }
        });
    }

    /**
     * Used to change the slice of an object in one of three dimemnsions
     * @param dimIdx specifies which dimension 0=x, 1=y, 2=z
     * @param val new slice value (0..1)
     * NB: Currently only used for 3d volumes
     */
    public setVolSlice(dimIdx: number, val: number) {
        throw new Error('Calling abstract method: setVolSlice(' + dimIdx + ',' + val + ') ');
    }
}

/**
 * Specialisation of 'SceneObject' used for plane objects
 */
export class PlaneSceneObject extends SceneObject {
    /**
     * Creates 'PlaneSceneObject' class
     * @param sceneObj object to be loaded into the scene
     */
    constructor(sceneObj: any) { super(sceneObj); }

    /**
     * Sets transparency of scene object
     * @param transparency number (0..1)
     */
    public setTransparency(transparency: number) {
        this.setMatTransparency(this.sceneObj['material'], transparency);
    }

    /**
     * Sets displacement of scene object
     * @param 3d vector displacement
     */
    public setDisplacement(displacement: THREE.Vector3) {
        this.setObjDisplacement(this.sceneObj, displacement);
    }
}


/**
 * Specialisation of 'SceneObject' used for WMS objects
 */
export class WMSSceneObject extends SceneObject {
    /**
     * Creates 'WMSSceneObject' class
     * @param sceneObj object to be loaded into the scene
     */
    constructor(sceneObj: any) { super(sceneObj); }

    /**
     * Sets transparency of scene object
     * @param transparency number (0..1)
     */
    public setTransparency(transparency: number) {
        this.sceneObj.opacity = transparency;
    }

    /**
     * Sets displacement of scene object
     * @param 3d vector displacement
     */
    public setDisplacement(displacement: THREE.Vector3) {
        throw new Error('FIXME: We don\'t have displacement for WMS yet: setVolSlice(' + displacement.toString() + ') ');
    }
}


/**
 * Specialisation of 'SceneObject' used for 3D Volume objects
 */
export class VolSceneObject extends SceneObject {
    /**
     * Creates 'VolSceneObject' class
     * @param sceneObj object to be loaded into the scene
     * @param volViewService the 'VolViewService' object
     * @param volView the 'VolView'
     */
    constructor(sceneObj: any, volViewService: VolviewService, volView: VolView) {
        super(sceneObj);
        this.volViewService = volViewService;
        this.volView = volView;
    }
    public volObjList: THREE.Object3D[] = [];
    private volViewService: VolviewService;
    private volView: VolView;

    /**
     * Sets visibility of scene object
     * @param visibility boolean
     */
    public setVisibility(visibility: boolean) {
        for (const obj of this.volObjList) {
            obj.visible = visibility;
        }
    }

    /**
     * Used to change the slice of an object in one of three dimemnsions
     * @param dimIdx specifies which dimension 0=x, 1=y, 2=z
     * @param val new slice value (0..1)
     */
    public setVolSlice(dimIdx: number, val: number) {
        const newSliceValList: [number, number, number] = [-1.0, -1.0, -1.0];
        newSliceValList[dimIdx] = val;
        this.volObjList = this.volViewService.makeSlices(this.volView, '', '', newSliceValList, this.volObjList, true);
    }

    /**
     * Sets transparency of scene object
     * @param transparency number (0..1)
     */
    public setTransparency(transparency: number) {
        for (const obj of this.volObjList) {
            this.setMatTransparency(obj['material'], transparency);
        }
    }

    /**
     * Sets displacement of scene object
     * @param 3d vector displacement
     */
    public setDisplacement(displacement: THREE.Vector3) {
        for (const obj of this.volObjList) {
            this.setObjDisplacement(obj, displacement);
        }
    }
}
