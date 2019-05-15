import * as THREE from 'three';
import { MAIN_LOOP_EVENTS } from '../../node_modules/itowns/lib/Core/MainLoop';

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
function ThreeDVirtSphereCtrls(scene, viewerDiv, camera, view, rotCentre, initCameraDist, cameraMoveCallback) {
    const scope = this;
    this.domElement = view.mainLoop.gfxEngine.renderer.domElement;
    this.rotCentre = rotCentre;
    this.viewerDiv = viewerDiv;
    this.cameraMoveCallback = cameraMoveCallback;
    this.scene = scene;
    this.initCameraDist = initCameraDist;

    // State of the model movement demonstration
    this.demoState = 0;

    // Animation mixer, used for model movement demonstration
    this.mixer = null;

    // Used to track mouse movement
    const mousePosition = new THREE.Vector2();
    const lastMousePosition = new THREE.Vector2(Number.MAX_VALUE, 0);

    // Rotational object, used to rotate the camera around the model
    const rObject = new THREE.Object3D();
    rObject.add(camera);

    // Set camera position relative to model centre
    camera.position.set(0.0, 0.0, initCameraDist);
    this.camera = camera;
    this.camera.lookAt(new THREE.Vector3());
    const viewObject = view;

    // Set position of rotational object relative to world centre
    rObject.name = 'ThreeDVirtSphereCtrls';
    rObject.position.set(rotCentre.x, rotCentre.y, rotCentre.z);

    // Move camera to look at model at a nice 45 degree angle to the Y-axis, facing north
    rObject.rotateZ( - Math.PI / 2.0);
    rObject.rotateY( Math.PI / 4.0);

    // Set mouse state for drag and rotate
    this.state = STATE.NONE;

    // Setup the AnimationMixer
    let runningDemo = false;

    // Update rObject's local matrix and store the value of the camera, rObject and offset for a future reset operation
    rObject.updateMatrix();
    this.resetState = { rObj: rObject.clone(), camera: this.camera.clone() };


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
        scope.updateMousePositionAndDelta(event);

        // notify change if moving
        if (scope.state !== STATE.NONE) {
            viewObject.notifyChange(true);
        }
    };


    /**
     * Called when mouse wheel is rotated
     * @param event mouse event
     */
    this.onMouseWheel = function onMouseWheel(event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.deltaY > 0) {
            camera.position.multiplyScalar(1 + ZOOM_FACTOR);
        } else {
            camera.position.multiplyScalar(1 - ZOOM_FACTOR);
        }
        // Update view
        viewObject.notifyChange(true);
    };


    /**
     * Move the rotational centre to a point
     * @param point Vector3 world coordinate to set the centre rotate point
     */
    this.setRotatePoint = function setRotatePoint(point: THREE.Vector3) {
        const diff = new THREE.Vector3();
        diff.subVectors(point, rObject.position);
        rObject.position.copy(point);
        rObject.updateMatrix();
        // Tell everyone that the camera has changed position
        scope.cameraMoveCallback();

        // Now that rotational centre is moved, must move the camera position back
        // because camera's global position = rObject.position + camera.position
        scope.camera.position.setX(scope.resetState.camera.position.x);
        scope.camera.position.setY(scope.resetState.camera.position.y);

        viewObject.notifyChange(true);
    };

    /**
     * Adjusts camera distance
     * @param newDist new distance value
     */
    this.adjustCamDist = function adjustCamDist(newDist: number) {
        camera.position.setZ(newDist);
        // Update view
        viewObject.notifyChange(true);
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
        if (scope.state === STATE.DRAG) {

            // Centre of screen in normalized device coordinates (-1 <= x,y <= 1)
            const centre = new THREE.Vector2();
            centre.set(0, 0);

            // Update the picking ray with the camera and centre screen position
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(centre, scope.camera);

            // Calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(scope.scene.children, true);
            if (intersects.length > 0) {
                // Pick closest object
                const point = intersects[0].point;
                // Move the rotational centre to that point
                scope.setRotatePoint(point);
            } else {
                // If no objects intersect, then pick a point in space
                // Get old camera position in world coords
                const startW = scope.resetState['cameraMouseDownWorldPos'];
                // Get current camera position in world coords
                const endW = new THREE.Vector3();
                scope.camera.getWorldPosition(endW);
                // Subtract old camera pos from new camera pos
                const diffW = new THREE.Vector3();
                diffW.subVectors(endW, startW);
                // Get current position of rotation point in world coords
                const rObjW = new THREE.Vector3();
                rObject.getWorldPosition(rObjW);
                // Add the camera movement
                rObjW.add(diffW);
                // Set new rotation point
                scope.setRotatePoint(rObjW);
            }
        }
        // When mouse button is let go of, reset mouse position tracking
        lastMousePosition.x = Number.MAX_VALUE;

        scope.state = STATE.NONE;
        scope.updateMouseCursorType();
    };


    /**
     * Initiates rotation or drag when any mouse button is pressed down
     * @param event mouse event
     */
    this.onMouseDown = function onMouseDown(event) {
        event.preventDefault();
        scope.updateMousePositionAndDelta(event);
        // Store the current camera position in world coords to help move model rotational centre
        const camWorldPos = new THREE.Vector3();
        scope.camera.getWorldPosition(camWorldPos);
        scope.resetState['cameraMouseDownWorldPos'] = camWorldPos;

        // Left click does rotation, right click does drag
        if (event.button === mouseButtons.LEFTCLICK) {
            scope.initiateRotation();
        } else if (event.button === mouseButtons.RIGHTCLICK) {
            scope.initiateDrag();
        }
        scope.updateMouseCursorType();
    };


    /**
      * Releases event listeners
      */
    this.dispose = function dispose() {
        scope.viewerDiv.removeEventListener('mousemove', scope.onMouseMove, false);
        scope.viewerDiv.removeEventListener('mouseup', scope.onMouseUp, false);
        scope.viewerDiv.removeEventListener('mousedown', scope.onMouseDown, false);
        scope.viewerDiv.removeEventListener('wheel', scope.onMouseWheel, false);
    };


    /**
      * Initiates rotation state
      */
    this.initiateRotation = function initiateRotation() {
        scope.state = STATE.ROTATE;
    };


    /**
      * Initiates drag state
      */
    this.initiateDrag = function initiateDrag() {
        scope.state = STATE.DRAG;
    };


    /*
    * Updates the view and camera if needed
    */
    this.update = function update(dt, updateLoopRestarted) {
        if (scope.state === STATE.DRAG) {
            scope.handleDragMovement();
        }
        if (scope.state === STATE.ROTATE) {
            scope.onRotate();
        }

        // Animation
        if (runningDemo) {
            scope.mixer.update(0.04);
            viewObject.notifyChange(true);
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
        const x_mvt = deltaMousePosition.y * MOVEMENT_FACTOR * scope.camera.position.length();
        const y_mvt = deltaMousePosition.x * MOVEMENT_FACTOR * scope.camera.position.length();
        scope.camera.position.x -= x_mvt;
        scope.camera.position.y -= y_mvt;
        viewObject.notifyChange(true);
    };


    /**
     * Returns the radius of the virtual sphere used by the controller
     * @return the radius of the virtual sphere in pixels
     */
    this.getVirtualSphereRadius = function getVirtualSphereRadius() {
        return Math.min(scope.domElement.clientHeight, scope.domElement.clientWidth) * VIRT_SPHERE_RADIUS;
    };


    /**
     * Returns the centre point of the virtual sphere used by the controller
     * @return returns the centre point in screen coordinates as [x,y], units are pixels
     */
     this.getVirtualSphereCentre = function getVirtualSphereCentre() {
         return [ scope.domElement.clientWidth / 2.0,
                 scope.domElement.clientHeight / 2.0];
     };


    /**
     * Returns true iff currently running the model demonstration
     * @return returns true iff currently running the model demonstration
     */
    this.isRunningDemo = function isRunningDemo() {
        return runningDemo;
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
        const centreOffsetX = scope.domElement.clientWidth / 2.0;
        const centreOffsetY = scope.domElement.clientHeight / 2.0;
        // Mouse position in normal XY coords
        const mp = new THREE.Vector2(mousePosition.x - centreOffsetX, centreOffsetY - mousePosition.y);
        // Last mouse position in normal XY coords
        const lmp = new THREE.Vector2(lastMousePosition.x - centreOffsetX, centreOffsetY - lastMousePosition.y);

        // Calculate change in mouse position
        const deltaMousePosition = new THREE.Vector2();
        deltaMousePosition.copy(mousePosition).sub(lastMousePosition);
        lastMousePosition.copy(mousePosition);

        const r = scope.getVirtualSphereRadius(); // Size of virtual sphere
        let rotAxisLocal;  // Rotational axis in virtual sphere coords
        let rDelta; // Rotational angle
        let rotAxis; // Rotational axis in camera coords

        // Exit if no change
        if (deltaMousePosition.x === 0.0 && deltaMousePosition.y === 0.0) {
            return;
        }

        if (mp.length() > r || lmp.length() > r) {
            // If mouse is outside the virtual sphere do a rotation around a vector pointing out perpendicular to the screen
            const dx = deltaMousePosition.x / scope.domElement.clientWidth;
            const dy = deltaMousePosition.y / scope.domElement.clientHeight;
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

        // Update view
        viewObject.notifyChange(true);

        // Tell caller that camera angle has changed
        scope.cameraMoveCallback();
    };


    /**
    * Update the cursor image according to the control state
    */
    this.updateMouseCursorType = function updateMouseCursorType() {
        switch (scope.state) {
            case STATE.NONE:
                scope.domElement.style.cursor = 'auto';
                break;
            case STATE.DRAG:
                scope.domElement.style.cursor = 'move';
                break;
            case STATE.ROTATE:
                scope.domElement.style.cursor = 'cell';
                break;
        }
    };


    /**
    * This function is called externally to add camera to the scene
    * @return object at centre of model (THREE.Object3D)
    */
    this.getObject = function getObject() {
        return rObject;
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
        runningDemo = false;
    };


    /**
     * Use threejs animation to perform model rotation demonstration
     * @param axisState 0 = rotate along x-axis, 1 = y-axis, 2 = z-axis, 3 = stop demo
     */
    this.runModelRotate = function runModelRotate(axisState) {

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
                runningDemo = false;
                return;
        }
        // Initial rotation = current rObject rotation
        const qInitial = new THREE.Quaternion().copy(rObject.quaternion);

        // Final rotation = current rObject rotation + 45 degree rotation along axis
        const qFinal = new THREE.Quaternion().copy(rObject.quaternion);
        const rotFinal = new THREE.Quaternion().setFromAxisAngle( axis, Math.PI / 4.0 );
        qFinal.multiply(rotFinal);

        // Quaternion keyframe track: rotate from initial to final, then back to initial again
        const quaternionKF = new THREE.QuaternionKeyframeTrack( '.quaternion', [ 0.0, 1.0, 2.0],
                                [ qInitial.x, qInitial.y, qInitial.z, qInitial.w,
                                  qFinal.x, qFinal.y, qFinal.z, qFinal.w,
                                  qInitial.x, qInitial.y, qInitial.z, qInitial.w ], THREE.InterpolateLinear);

        // Create an animation sequence from the keyframe track
        const clip = new THREE.AnimationClip( 'Action', 10.0, [ quaternionKF ] );
        scope.mixer = new THREE.AnimationMixer(rObject);
        scope.mixer.addEventListener('finished', scope.stopDemoLoop);
        const action = scope.mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.play();
        runningDemo = true;
        viewObject.notifyChange(true);
    };


    /**
     * Sets the camera back to its initial position
     */
    this.resetView = function resetView() {
        // Restore rObject, camera position and offset
        rObject.position.copy(scope.resetState.rObj.position);
        rObject.matrix.copy(scope.resetState.rObj.matrix);
        rObject.rotation.setFromRotationMatrix(rObject.matrix);
        scope.camera.position.copy(scope.resetState.camera.position);

        // Update view
        viewObject.notifyChange(true);
    };


    /**
     * Returns the camera position as a set of Euler angles
     */
    this.getCameraPosition = function getCameraPosition() {
        return rObject.rotation;
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
