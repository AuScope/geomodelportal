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

/**
* Three axis virtual globe controller
* @param viewerDiv div where the graphics will be displayed
* @param camera camera object for viewing
* @param view view object
* @param rotCentre centre of rotation (THREE.Vector3)
* @param cameraDist distance from camera to centre of model (metres)
* @param mouseEventCallback function to be called upon mouse events format: function()
*/
function GeoModelControls(viewerDiv, camera, view, rotCentre, cameraDist, modelMoveCallback) {
    const scope = this;
    this.domElement = view.mainLoop.gfxEngine.renderer.domElement;
    this.rotCentre = rotCentre;
    this.viewerDiv = viewerDiv;
    this.modelMoveCallback = modelMoveCallback;

    // State of the model movement demonstration
    this.demoState = 0;

    // Animation mixer, used for model movement demonstration
    this.mixer = null;

    // Mouse movement
    const mousePosition = new THREE.Vector2();
    const lastMousePosition = new THREE.Vector2();
    const deltaMousePosition = new THREE.Vector2(0, 0);

    // Keeps track of camera's movement due to mouse drag
    // This helps us move the virtual sphere around the page
    this.cameraOffset = new THREE.Vector3();

    // Rotational object, used to rotate the camera around the model
    const rObject = new THREE.Object3D();
    rObject.add(camera);

    // Set camera position relative to model centre
    camera.position.set(0.0, 0.0, cameraDist);
    this.camera = camera;
    this.rotateSpeed = 1.5;
    const viewObject = view;

    // Set position of rotational object relative to world centre
    rObject.name = 'GeoModelControls';
    rObject.position.set(rotCentre.x, rotCentre.y, rotCentre.z);

    // Move camera to look at model at a nice angle
    rObject.rotateY(Math.PI / 4.0);

    // Set mouse state for drag and rotate
    this.state = STATE.NONE;

    // Setup the AnimationMixer
    let runningDemo = false;

    // Update rObject's local matrix and store the value of the camera, rObject and offset for a future reset operation
    rObject.updateMatrix();
    this.resetState = { rObj: rObject.clone(), camera: this.camera.clone(), offset: this.cameraOffset.clone() };

    /**
     * Called when we need to update our record of the mouse position and delta
     * @param event mouse event
     */
    this.updateMousePositionAndDelta = function updateMousePositionAndDelta(event) {
        mousePosition.set(event.offsetX, event.offsetY);
        deltaMousePosition.copy(mousePosition).sub(lastMousePosition);
        lastMousePosition.copy(mousePosition);
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
            camera.position.multiplyScalar(1.04);
        } else {
            camera.position.multiplyScalar(0.96);
        }
        // Update view
        viewObject.notifyChange(true);
    };

    /**
     * Updates state when a mouse button is released
     * @param event mouse event
     */
    this.onMouseUp = function onMouseUp(event) {
        event.preventDefault();
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
        deltaMousePosition.set(0, 0);

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
        const MOVEMENT_FACTOR = 0.0006;
        // Move the camera
        scope.camera.position.x -= deltaMousePosition.y * MOVEMENT_FACTOR * scope.camera.position.length();
        scope.camera.position.y -= deltaMousePosition.x * MOVEMENT_FACTOR * scope.camera.position.length();
        // Keep track of this movement so we can move the virtual sphere with the model
        scope.cameraOffset.x += deltaMousePosition.x;
        scope.cameraOffset.y += deltaMousePosition.y;
        // Tell everyone that the model has changed position
        scope.modelMoveCallback(true, false);
    };

    /**
     * Returns the radius of the virtual sphere used by the controller
     * @return the radius of the virtual sphere in pixels
     */
    this.getVirtualSphereRadius = function getVirtualSphereRadius() {
        return scope.domElement.clientHeight / 3.0;
    };

    /**
     * Returns the centre point of the virtual sphere used by the controller
     * @return returns the centre point in screen coordinates as [x,y], units are pixels
     */
     this.getVirtualSphereCentre = function getVirtualSphereCentre() {
         return [ scope.domElement.clientWidth / 2.0 + scope.cameraOffset.x,
                 scope.domElement.clientHeight / 2.0 + scope.cameraOffset.y];
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
        // This translates our mouse coords into Three.js coords
        const myLastMousePosition = new THREE.Vector2(0, 0);
        myLastMousePosition.copy(mousePosition).sub(deltaMousePosition);
        // The centre of the virtual sphere is centre of screen +/- offset due to mouse movement
        const centreOffsetX = scope.domElement.clientWidth / 2.0 + scope.cameraOffset.x;
        const centreOffsetY = scope.domElement.clientHeight / 2.0 + scope.cameraOffset.y;
        // Mouse position in normal XY coords
        const mp = new THREE.Vector2(mousePosition.x - centreOffsetX, centreOffsetY - mousePosition.y);
        // Last mouse position in normal XY coords
        const lmp = new THREE.Vector2(myLastMousePosition.x - centreOffsetX, centreOffsetY - myLastMousePosition.y);
        const r = this.getVirtualSphereRadius(); // Size of virtual globe
        let rotAxisLocal;  // Rotational axis in virtual sphere coords
        let rDelta = 0.0; // Rotational angle
        let rotAxis; // Rotational axis in camera coords

        // Exit if no change
        if (deltaMousePosition.x === 0.0 && deltaMousePosition.y === 0.0) {
            return;
        }

        if (mp.length() > r || lmp.length() > r) {
            // If outside the sphere do a pure rotation
            const dx = deltaMousePosition.x / scope.domElement.clientWidth;
            const dy = deltaMousePosition.y / scope.domElement.clientHeight;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) {
                    if (mp.y > 0) {
                        rDelta = -scope.rotateSpeed * dx;
                    } else {
                        rDelta = scope.rotateSpeed * dx;
                    }
                } else if (mp.y > 0) {
                    rDelta = -scope.rotateSpeed * dx;
                } else {
                    rDelta = scope.rotateSpeed * dx;
                }
            } else if (dy > 0) {
                if ((mp.y > 0 && mp.x > 0) || (mp.y < 0 && mp.x > 0)) {
                    rDelta = -scope.rotateSpeed * dy;
                } else {
                    rDelta = scope.rotateSpeed * dy;
                }
            } else if ((mp.y > 0 && mp.x > 0) || (mp.y < 0 && mp.x > 0)) {
                rDelta = -scope.rotateSpeed * dy;
            } else {
                rDelta = scope.rotateSpeed * dy;
            }

            // Rotational axis in camera coordinates
            rotAxis = new THREE.Vector3(0.0, 0.0, -1.0);
            rotAxis.normalize();

        } else {
            // If inside the sphere calculate start point and end point on sphere of radius r
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
        scope.modelMoveCallback(false, true);
    };

    /**
    * Update the cursor image according to the control state
    */
    this.updateMouseCursorType = function updateMouseCursorType() {
        switch (this.state) {
            case STATE.NONE:
                scope.domElement.style.cursor = 'auto';
                break;
            case STATE.DRAG:
                scope.domElement.style.cursor = 'move';
                break;
            case STATE.ROTATE:
                scope.domElement.style.cursor = 'cell';
                break;
            default:
                break;
        }
    };

    /**
    * This function is called externally to add camera to the scene
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
    this.stopDemoLoop = function stopDemoLoop(e) {
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
        const qInitial = new THREE.Quaternion().setFromAxisAngle( axis, 0 );
        const qFinal = new THREE.Quaternion().setFromAxisAngle( axis, Math.PI / 4.0 );
        const quaternionKF = new THREE.QuaternionKeyframeTrack( '.quaternion', [ 0.0, 1.0, 2.0],
                                [ qInitial.x, qInitial.y, qInitial.z, qInitial.w,
                                  qFinal.x, qFinal.y, qFinal.z, qFinal.w,
                                  qInitial.x, qInitial.y, qInitial.z, qInitial.w ], THREE.InterpolateLinear);

        // Create an animation sequence from the keyframe track
        const clip = new THREE.AnimationClip( 'Action', 10.0, [ quaternionKF ] );
        this.mixer = new THREE.AnimationMixer(rObject);
        this.mixer.addEventListener('finished', this.stopDemoLoop);
        const action = this.mixer.clipAction(clip);
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
        rObject.position.copy(this.resetState.rObj.position);
        rObject.matrix.copy(this.resetState.rObj.matrix);
        rObject.rotation.setFromRotationMatrix(rObject.matrix);
        scope.camera.position.copy(this.resetState.camera.position);
        scope.cameraOffset.copy(this.resetState.offset);

        // Update view
        viewObject.notifyChange(true);
    };

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

}

export default GeoModelControls;
