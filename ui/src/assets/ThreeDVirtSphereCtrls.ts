import * as THREE from 'three';
import { MAIN_LOOP_EVENTS } from 'itowns/lib/Core/MainLoop';

// control state
const STATE = {
    NONE: -1,
    DRAG: 0,
    ROTATE: 1,
};

const mouseButtons = {
    LEFTCLICK: THREE.MOUSE.LEFT,
    MIDDLECLICK: THREE.MOUSE.MIDDLE,
    RIGHTCLICK: THREE.MOUSE.RIGHT,
};

// Mouse wheel is used to zoom in/out. This number can be altered to adjust its sensitivity
const ZOOM_FACTOR = 0.04;

// Right mouse button is used to move the model. This number can be altered to adjust its sensitivity
const MOVEMENT_FACTOR = 0.00066;

// Left mouse button is used to rotate the model. This number controls the rotation speed when mouse is outside virtual sphere (mouse guide)
const ROTATE_SPEED = 2.25;

// Radius of virtal sphere as a percentage of the screen width or height, whichever is smaller
const VIRT_SPHERE_RADIUS = 0.33333;

/**
* Three axis virtual globe controller
* + Mouse wheel is used to zoom in/out.
* + Right mouse button is used to drag the model around the screen.
* + Left mouse button is used to rotate the model. XY-rotations are done if mouse is in within the virtual sphere (mouse guide).
*   Z-rotations are done if the mouse is outside the virtual sphere.
*
* @param scene the scene on which the graphics is built
* @param viewerDiv div where the graphics will be displayed
* @param camera camera object for viewing
* @param view view object
* @param rotCentre centre of rotation (THREE.Vector3)
* @param initCameraDist initial distance from camera to centre of model (metres)
* @param mouseEventCallback function to be called upon mouse events format: function()
*/
function ThreeDVirtSphereCtrls(scene: THREE.Object3D, viewerDiv, camera: THREE.PerspectiveCamera, view,
                               rotCentre: THREE.Vector3, initCameraDist: number, cameraMoveCallback) {
    const local = this;
    this.domElement = view.mainLoop.gfxEngine.renderer.domElement;
    this.rotCentre = rotCentre;
    this.viewerDiv = viewerDiv;
    this.cameraMoveCallback = cameraMoveCallback;
    this.scene = scene;
    this.initCameraDist = initCameraDist;
    this.realCamera = camera;
    this.dummyCamera = new THREE.Object3D();
    const viewObject = view;

    // Set mouse state for drag and rotate
    this.state = STATE.NONE;

    // Used to track mouse movement
    const mousePosition = new THREE.Vector2();
    const lastMousePosition = new THREE.Vector2(Number.MAX_VALUE, 0);

    // Set camera position relative to model centre
    this.dummyCamera.position.set(0.0, 0.0, initCameraDist);

    // Rotational object, used to rotate the camera around the model
    const rObject = new THREE.Object3D();
    this.rObject = rObject;

    // Set position of rotational object relative to world centre
    rObject.name = 'ThreeDVirtSphereCtrls';
    rObject.position.copy(rotCentre);

    // Move camera to look at model at a nice 45 degree angle to the Y-axis, facing north
    rObject.rotateZ( - Math.PI / 2.0);
    rObject.rotateY( Math.PI / 4.0);
    rObject.updateMatrixWorld(true);

    // Update rObject's local matrix and store the value of the camera, rObject and offset for a future reset operation
    rObject.add(this.dummyCamera);
    scene.add(rObject);
    this.resetState = { rObj: rObject.clone(), camera: this.dummyCamera.clone() };

    const wPos = new THREE.Vector3();
    this.dummyCamera.getWorldPosition(wPos);
    this.realCamera.position.copy(wPos);
    this.realCamera.lookAt(rotCentre);
    this.realCamera.updateMatrixWorld(true);
    this.realCamera.updateProjectionMatrix();
    viewObject.notifyChange(local.realCamera, true);


    /**
     * Called when we need to update our record of the mouse position and delta
     * @param event mouse event
     */
    this.updateMousePositionAndDelta = function updateMousePositionAndDelta(event) {
        mousePosition.set(event.offsetX, event.offsetY);
    };


    /**
      * Called when mouse pointer is moved
      * @param event mouse event
      */
    this.onMouseMove = function onMouseMove(event) {
        event.preventDefault();
        local.updateMousePositionAndDelta(event);

        // notify change if moving
        if (local.state !== STATE.NONE) {
            viewObject.notifyChange(local.realCamera, true);
        }
    };

    /**
     * Update the real camera with the current position and rotation of the dummy camera
     */
    this.updateCamera = function upateCamera() {
        const wPosi = new THREE.Vector3();
        const wQuat = new THREE.Quaternion();
        local.dummyCamera.getWorldPosition(wPosi);
        local.dummyCamera.getWorldQuaternion(wQuat);
        local.realCamera.position.copy(wPosi);
        local.realCamera.setRotationFromQuaternion(wQuat);
        local.realCamera.rotateZ( Math.PI / 2.0);
        local.realCamera.updateProjectionMatrix();
        viewObject.notifyChange(local.realCamera, true);
    };

    /**
     * Called when mouse wheel is rotated
     * @param event mouse event
     */
    this.onMouseWheel = function onMouseWheel(event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.deltaY > 0) {
            local.dummyCamera.position.multiplyScalar(1 + ZOOM_FACTOR);
        } else {
            local.dummyCamera.position.multiplyScalar(1 - ZOOM_FACTOR);
        }
        // Update view
        local.updateCamera();
    };


    /**
     * Move the rotational centre to a point
     * @param point Vector3 world coordinate to set the centre rotate point
     */
    this.setRotatePoint = function setRotatePoint(point: THREE.Vector3) {
        const diff = new THREE.Vector3();
        diff.subVectors(point, rObject.position);
        rObject.position.copy(point);
        rObject.updateMatrixWorld(true);
        rObject.updateMatrix();
        // Tell everyone that the camera has changed position
        local.cameraMoveCallback();

        // Now that rotational centre is moved, must move the camera position back
        // because camera's global position = rObject.position + camera.position
        local.dummyCamera.position.setX(local.resetState.camera.position.x);
        local.dummyCamera.position.setY(local.resetState.camera.position.y);
        local.updateCamera();
    };

    /**
     * Adjusts camera distance
     * @param newDist new distance value
     */
    this.adjustCamDist = function adjustCamDist(newDist: number) {
        local.dummyCamera.position.setZ(newDist);
        // Update view
        local.updateCamera();
    };


    /**
     * Updates state when a mouse button is released
     * i.e. update rotational centre of model and mouse position tracking
     * @param event mouse event
     */
    this.onMouseUp = function onMouseUp(event) {
        event.preventDefault();
        // Try to rotate the object around a point on the model, by casting a ray to centre of screen
        // If no part of the model is in centre of screen, then rotate around a point in space
        if (local.state === STATE.DRAG) {

            // Centre of screen in normalized device coordinates (-1 <= x,y <= 1)
            const centre = new THREE.Vector2();
            centre.set(0, 0);

            // Update the picking ray with the camera and centre screen position
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(centre, local.realCamera);

            // Calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(local.scene.children, true);
            if (intersects.length > 0) {
                // Pick closest object
                const point = intersects[0].point;
                // Move the rotational centre to that point
                local.setRotatePoint(point);
            } else {
                // If no objects intersect, then pick a point in space
                // Get old camera position in world coords
                const startW = local.resetState['cameraMouseDownWorldPos'];
                // Get current camera position in world coords
                const endW = new THREE.Vector3();
                local.dummyCamera.getWorldPosition(endW);
                // Subtract old camera pos from new camera pos
                const diffW = new THREE.Vector3();
                diffW.subVectors(endW, startW);
                // Get current position of rotation point in world coords
                const rObjW = new THREE.Vector3();
                rObject.getWorldPosition(rObjW);
                // Add the camera movement
                rObjW.add(diffW);
                // Set new rotation point
                local.setRotatePoint(rObjW);
            }
        }
        // When mouse button is let go of, reset mouse position tracking
        lastMousePosition.x = Number.MAX_VALUE;

        local.state = STATE.NONE;
        local.updateMouseCursorType();
    };


    /**
     * Initiates rotation or drag when any mouse button is pressed down
     * @param event mouse event
     */
    this.onMouseDown = function onMouseDown(event) {
        event.preventDefault();
        local.updateMousePositionAndDelta(event);
        // Store the current camera position in world coords to help move model rotational centre
        const camWorldPos = new THREE.Vector3();
        local.dummyCamera.getWorldPosition(camWorldPos);
        local.resetState['cameraMouseDownWorldPos'] = camWorldPos;

        // Left click does rotation, right click does drag
        if (event.button === mouseButtons.LEFTCLICK) {
            local.initiateRotation();
        } else if (event.button === mouseButtons.RIGHTCLICK) {
            local.initiateDrag();
        }
        local.updateMouseCursorType();
    };


    /**
      * Releases event listeners
      */
    this.dispose = function dispose() {
        local.viewerDiv.removeEventListener('mousemove', local.onMouseMove, false);
        local.viewerDiv.removeEventListener('mouseup', local.onMouseUp, false);
        local.viewerDiv.removeEventListener('mousedown', local.onMouseDown, false);
        local.viewerDiv.removeEventListener('wheel', local.onMouseWheel, false);
    };


    /**
      * Initiates rotation state
      */
    this.initiateRotation = function initiateRotation() {
        local.state = STATE.ROTATE;
    };


    /**
      * Initiates drag state
      */
    this.initiateDrag = function initiateDrag() {
        local.state = STATE.DRAG;
    };


    /*
    * Updates the view and camera if needed
    */
    this.update = function update(_dt, _updateLoopRestarted) {
        if (local.state === STATE.DRAG) {
            local.handleDragMovement();
        }
        if (local.state === STATE.ROTATE) {
            local.onRotate();
        }

        // Animation
        if (local.demoAction && local.demoMixer && local.demoAction.isRunning()) {
            local.demoMixer.update(0.04);
            local.updateCamera();
        }
    };


    /**
    * Moves the camera in its XY plane according to the mouse movements
    */
    this.handleDragMovement = function handleDragMovement() {

        // If first time, then just copy and return
        if (lastMousePosition.x === Number.MAX_VALUE) {
          lastMousePosition.copy(mousePosition);
          return;
        }
        // Move the camera
        const deltaMousePosition = new THREE.Vector2();
        deltaMousePosition.copy(mousePosition).sub(lastMousePosition);
        lastMousePosition.copy(mousePosition);
        const x_mvt = deltaMousePosition.y * MOVEMENT_FACTOR * local.dummyCamera.position.length();
        const y_mvt = deltaMousePosition.x * MOVEMENT_FACTOR * local.dummyCamera.position.length();
        local.dummyCamera.position.x -= x_mvt;
        local.dummyCamera.position.y -= y_mvt;
        local.updateCamera();
    };


    /**
     * Returns the radius of the virtual sphere used by the controller
     * @return the radius of the virtual sphere in pixels
     */
    this.getVirtualSphereRadius = function getVirtualSphereRadius() {
        return Math.min(local.domElement.clientHeight, local.domElement.clientWidth) * VIRT_SPHERE_RADIUS;
    };


    /**
     * Returns the centre point of the virtual sphere used by the controller
     * @return returns the centre point in screen coordinates as [x,y], units are pixels
     */
     this.getVirtualSphereCentre = function getVirtualSphereCentre() {
         return [ local.domElement.clientWidth / 2.0,
                 local.domElement.clientHeight / 2.0];
     };


    /**
     * Returns true iff currently running the model demonstration
     * @return returns true iff currently running the model demonstration
     */
    this.isRunningDemo = function isRunningDemo() {
        if (local.demoAction) {
            return local.demoAction.isRunning();
        }
        return false;
    };


    /**
    * Rotates the camera about the centre of the model
    */
    this.onRotate = function onRotate() {
        // If first time, lastMousePosition is uninitialised, so just copy and return
        if (lastMousePosition.x === Number.MAX_VALUE) {
          lastMousePosition.copy(mousePosition);
          return;
        }

        // The centre of the virtual sphere is centre of screen +/- offset due to mouse movement
        const centreOffsetX = local.domElement.clientWidth / 2.0;
        const centreOffsetY = local.domElement.clientHeight / 2.0;
        // Mouse position in normal XY coords
        const mp = new THREE.Vector2(mousePosition.x - centreOffsetX, centreOffsetY - mousePosition.y);
        // Last mouse position in normal XY coords
        const lmp = new THREE.Vector2(lastMousePosition.x - centreOffsetX, centreOffsetY - lastMousePosition.y);

        // Calculate change in mouse position
        const deltaMousePosition = new THREE.Vector2();
        deltaMousePosition.copy(mousePosition).sub(lastMousePosition);
        lastMousePosition.copy(mousePosition);

        const r = local.getVirtualSphereRadius(); // Size of virtual sphere
        let rotAxisLocal: THREE.Vector3;  // Rotational axis in virtual sphere coords
        let rDelta: number; // Rotational angle
        let rotAxis: THREE.Vector3; // Rotational axis in camera coords

        // Exit if no change
        if (deltaMousePosition.x === 0.0 && deltaMousePosition.y === 0.0) {
            return;
        }

        if (mp.length() > r || lmp.length() > r) {
            // If mouse is outside the virtual sphere do a rotation around a vector pointing out perpendicular to the screen
            const dx = deltaMousePosition.x / local.domElement.clientWidth;
            const dy = deltaMousePosition.y / local.domElement.clientHeight;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) {
                    if (mp.y > 0) {
                        rDelta = -ROTATE_SPEED * dx;
                    } else {
                        rDelta = ROTATE_SPEED * dx;
                    }
                } else if (mp.y > 0) {
                    rDelta = -ROTATE_SPEED * dx;
                } else {
                    rDelta = ROTATE_SPEED * dx;
                }
            } else if (dy > 0) {
                if ((mp.y > 0 && mp.x > 0) || (mp.y < 0 && mp.x > 0)) {
                    rDelta = -ROTATE_SPEED * dy;
                } else {
                    rDelta = ROTATE_SPEED * dy;
                }
            } else if ((mp.y > 0 && mp.x > 0) || (mp.y < 0 && mp.x > 0)) {
                rDelta = -ROTATE_SPEED * dy;
            } else {
                rDelta = ROTATE_SPEED * dy;
            }

            // Rotational axis in camera coordinates
            rotAxis = new THREE.Vector3(0.0, 0.0, -1.0);
            rotAxis.normalize();

        } else {
            // If mouse is inside the sphere calculate start point and end point on sphere of radius r
            const endVecLocal = new THREE.Vector3(mp.x, mp.y, Math.sqrt(r * r - mp.x * mp.x - mp.y * mp.y));
            endVecLocal.normalize();
            const startVecLocal = new THREE.Vector3(lmp.x, lmp.y, Math.sqrt(r * r - lmp.x * lmp.x - lmp.y * lmp.y));
            startVecLocal.normalize();
            rotAxisLocal = endVecLocal.clone();
            // Cross product of start and end vectors on sphere gives rotational vector, in local camera coords
            rotAxisLocal.cross(startVecLocal);
            rotAxisLocal.normalize();

            // Calculate rotational angle and rotational axis
            rDelta = endVecLocal.angleTo(startVecLocal);
            rotAxis = new THREE.Vector3(-rotAxisLocal.y, rotAxisLocal.x, rotAxisLocal.z);
        }

        // Rotate camera relative to model
        const rMat = new THREE.Matrix4();
        rMat.makeRotationAxis(rotAxis, rDelta);
        rObject.matrix.multiply(rMat);
        rObject.rotation.setFromRotationMatrix(rObject.matrix);
        rObject.updateMatrixWorld(true);
        local.updateCamera();

        // Tell caller that camera angle has changed
        local.cameraMoveCallback();
    };


    /**
    * Update the cursor image according to the control state
    */
    this.updateMouseCursorType = function updateMouseCursorType() {
        switch (local.state) {
            case STATE.NONE:
                local.domElement.style.cursor = 'auto';
                break;
            case STATE.DRAG:
                local.domElement.style.cursor = 'move';
                break;
            case STATE.ROTATE:
                local.domElement.style.cursor = 'cell';
                break;
        }
    };


    /**
     * @return direction that camera is facing (THREE.Vector3)
     */
    this.getDirection = (() => {
        const direction = new THREE.Vector3(0, 0, -1);
        const rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        return (v) => {
            rotation.set(rObject.rotation.x, rObject.rotation.y, rObject.rotation.z);
            v.copy(direction).applyEuler(rotation);
            return v;
        };
    })();


    /**
     * Stops the demo loop
     */
    this.stopDemoLoop = function stopDemoLoop() {
        local.demoAction.stop();
        local.updateCamera();
    };


    /**
     * Use threejs animation to perform model rotation demonstration
     * @param axisState 0 = rotate along x-axis, 1 = y-axis, 2 = z-axis, 3 = stop demo
     */
    this.runModelRotate = function runModelRotate(axisState: number) {

        let axis = null;
        switch (axisState) {
            case 0:
                axis = new THREE.Vector3( 1, 0, 0 );
                break;
            case 1:
                axis = new THREE.Vector3( 0, 1, 0 );
                break;
            case 2:
                axis = new THREE.Vector3( 0, 0, 1 );
                break;
            default:
                local.stopDemoLoop();
                return;
        }
        // Initial rotation = current rObject rotation
        const qInitial = new THREE.Quaternion().copy(local.rObject.quaternion);

        // Final rotation = current rObject rotation + 45 degree rotation along axis
        const qFinal = new THREE.Quaternion().copy(local.rObject.quaternion);
        const rotFinal = new THREE.Quaternion().setFromAxisAngle( axis, Math.PI / 4.0 );
        qFinal.multiply(rotFinal);

        // Quaternion keyframe track: rotate from initial to final, then back to initial again
        const quaternionKF = new THREE.QuaternionKeyframeTrack( '.quaternion', [ 0.0, 1.0, 2.0],
                                [ qInitial.x, qInitial.y, qInitial.z, qInitial.w,
                                  qFinal.x, qFinal.y, qFinal.z, qFinal.w,
                                  qInitial.x, qInitial.y, qInitial.z, qInitial.w ], THREE.InterpolateLinear);

        // Create an animation sequence from the keyframe track
        const clip = new THREE.AnimationClip( 'Action', 10.0, [ quaternionKF ] );
        local.demoMixer = new THREE.AnimationMixer(local.rObject);
        local.demoAction = local.demoMixer.clipAction(clip);
        local.demoAction.setLoop(THREE.LoopOnce, 1);
        local.demoAction.play();
    };


    /**
     * Sets the camera back to its initial position
     */
    this.resetView = function resetView() {
        // Restore rObject, camera position and offset
        rObject.position.copy(local.resetState.rObj.position);
        rObject.matrix.copy(local.resetState.rObj.matrix);
        rObject.rotation.setFromRotationMatrix(rObject.matrix);
        rObject.updateMatrixWorld(true);
        local.dummyCamera.position.copy(local.resetState.camera.position);

        // Update view
        local.updateCamera();
    };


    /**
     * Updates the view of the scene after something has been changed
     */
    this.updateView = function updateView() {
        // Update view
        local.updateCamera();
    };


    /**
     * Returns the camera position as a set of Euler angles
     */
    this.getCameraPosition = function getCameraPosition() {
        return rObject.rotation;
    };

    /**
     * Moves the camera to look at an object in the scene
     * @param sceneObj object (Object3D) to be looked at
     */
    this.moveViewToObj = function moveViewToSceneObj(sceneObj) {
        let maxR = -1.0;
        let maxObj = null;
        const sumCentre = new THREE.Vector3();
        let numCentre = 0;
        const maxCentre = new THREE.Vector3(-Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER);
        const minCentre = new THREE.Vector3(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
        sceneObj.traverse(function(obj) {
            // Survey geometry of object, getting mean centre and dimensions from bounding sphere
            if (obj.geometry && obj.geometry.boundingSphere) {
                const centre = new THREE.Vector3(obj.geometry.boundingSphere.center.x,
                obj.geometry.boundingSphere.center.y, obj.geometry.boundingSphere.center.z);
                sumCentre.add(centre);
                maxCentre.max(centre);
                minCentre.min(centre);
                numCentre += 1;
                if (obj.geometry.boundingSphere.radius > maxR) {
                    maxR = obj.geometry.boundingSphere.radius;
                    maxObj = obj;
                }
            }
         });
         // If not successful look for vertex coords in geometry attributes
         if (numCentre === 0) {
             sceneObj.traverse(function(obj) {
                 let x, y, z;
                 // Survey geometry of object, getting mean centre and max & min dimensions
                 if (obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position) {
                     obj.geometry.attributes.position.array.forEach(function(elem, idx, _arr) {
                         switch (idx % 3) {
                             case 0:
                                 x = elem;
                                 break;
                             case 1:
                                 y = elem;
                                 break;
                             case 2: {
                                     z = elem;
                                     const centre = new THREE.Vector3(x, y, z);
                                     sumCentre.add(centre);
                                     maxCentre.max(centre);
                                     minCentre.min(centre);
                                     numCentre += 1;
                                 }
                         }
                     });
                     if (numCentre > 0) {
                         maxObj = obj;
                         // done = true;
                     }
                 }
              });

         }

         // Set rotation point to centre of object
         if (numCentre > 0 && maxObj !== null) {
             const point = new THREE.Vector3(sumCentre.x / numCentre, sumCentre.y / numCentre,
                 sumCentre.z / numCentre);
             this.setRotatePoint(point);

             // Adjust camera distance to the size of the object
             const diffCentre = new THREE.Vector3();
             diffCentre.subVectors(maxCentre, minCentre);
             const centreRadius = diffCentre.length();
             const maxRadius = Math.max(centreRadius, maxR);

             // Roughly set the distance according to the size of the object
             let newDist = maxRadius * 3.0;
             if (maxRadius < 50000) {
                 newDist = maxRadius * 2.5;
             } else if (maxRadius > 150000) {
                 newDist = maxRadius * 5.0;
             }
             this.adjustCamDist(newDist);
             return true;
         }
         return false;
    };


    // Add this GeoModelControl instance to the view's frame requesters
    // with this, GeoModelControl.update() will be called each frame
    viewObject.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE, this.update.bind(this));

    // Add event listeners for mouse events
    this.viewerDiv.addEventListener('mousemove', this.onMouseMove, false);
    this.viewerDiv.addEventListener('mouseup', this.onMouseUp, false);
    this.viewerDiv.addEventListener('mousedown', this.onMouseDown, false);
    this.viewerDiv.addEventListener('wheel', this.onMouseWheel, false);
    // Stops the right hand click menu item popping up in the viewing area
    this.viewerDiv.addEventListener('contextmenu', event => event.preventDefault());
}

export default ThreeDVirtSphereCtrls;
