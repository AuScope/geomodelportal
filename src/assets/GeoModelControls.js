
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
*/
function GeoModelControls(camera, view, rotCentre) {
    var scope = this;
    this.domElement = view.mainLoop.gfxEngine.renderer.domElement;
    this.rotCentre = rotCentre;

    // mouse movement
    const mousePosition = new THREE.Vector2();
    const lastMousePosition = new THREE.Vector2();
    const deltaMousePosition = new THREE.Vector2(0, 0);

    // Keeps track of camera's movement due to mouse drag
    // This helps us move the virtual sphere around the page
    this.cameraOffset = new THREE.Vector3();

    // Rotational object, used to rotate the camera around the model
    var rObject = new THREE.Object3D();
    rObject.add(camera);
    // Set relative to model centre
    camera.position.set(0.0, 0.0, 200000.0);
    this.camera = camera;
    this.rotateSpeed = 1.5;
    var viewObject = view;

    // Set position of rotational object relative to world centre
    rObject.name = 'GeoModelControls';
    rObject.position.set(rotCentre.x, rotCentre.y, rotCentre.z);

    // Set mouse state for drag and rotate
    this.state = STATE.NONE;

    this.updateMousePositionAndDelta = function updateMousePositionAndDelta(event) {
        mousePosition.set(event.offsetX, event.offsetY);
        deltaMousePosition.copy(mousePosition).sub(lastMousePosition);
        lastMousePosition.copy(mousePosition);
    };

    this.onMouseMove = function onMouseMove(event) {
        event.preventDefault();
        scope.updateMousePositionAndDelta(event);

        // notify change if moving
        if (scope.state !== STATE.NONE) {
            viewObject.notifyChange(true);
        }
    };

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

    this.onMouseUp = function onMouseUp(event) {
        event.preventDefault();
        scope.state = STATE.NONE;
        scope.updateMouseCursorType();
    };

    this.onMouseDown = function onMouseDown(event) {
        // eslint-disable-next-line no-console
        // console.log('mouseDown');
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

    this.dispose = function dispose() {
        document.removeEventListener('mousemove', this.onMouseMove, false);
        document.removeEventListener('mouseup', this.onMouseUp, false);
        document.removeEventListener('mousedown', this.onMouseDown, false);
        document.removeEventListener('wheel', this.onMouseWheel, false);
    };

    this.initiateRotation = function initiateRotation() {
        scope.state = STATE.ROTATE;
    };

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
    };

    /**
    * Add this GeoModelControl instance to the view's frame requesters
    * with this, GeoModelControl.update() will be called each frame
    */
    viewObject.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE, this.update.bind(this));

    /**
    * Moves the camera in its XY plane according to the mouse movements
    */
    this.handleDragMovement = function handleDragMovement() {
        const MOVEMENT_FACTOR = 0.0006;
        // Move the camera
        scope.camera.position.x -= deltaMousePosition.y*MOVEMENT_FACTOR*scope.camera.position.length();
        scope.camera.position.y -= deltaMousePosition.x*MOVEMENT_FACTOR*scope.camera.position.length();
        // Keep track of this movement so we can move the virtual sphere with the model
        scope.cameraOffset.x += deltaMousePosition.x;
        scope.cameraOffset.y += deltaMousePosition.y;
    };

    /**
    * Rotates the camera about the centre of the model
    */
    this.onRotate = function onRotate() {
        // This translates our mouse coords into Three.js coords
        var lastMousePosition = new THREE.Vector2(0, 0);
        lastMousePosition.copy(mousePosition).sub(deltaMousePosition);
        // The centre of the virtual sphere is centre of screen +/- offset due to mouse movement
        var centreOffsetX = scope.domElement.clientWidth / 2.0 + scope.cameraOffset.x;
        var centreOffsetY = scope.domElement.clientHeight / 2.0 + scope.cameraOffset.y;
        // Mouse position in normal XY coords
        var mp = new THREE.Vector2(mousePosition.x - centreOffsetX, centreOffsetY - mousePosition.y);
        // Last mouse position in normal XY coords
        var lmp = new THREE.Vector2(lastMousePosition.x - centreOffsetX, centreOffsetY - lastMousePosition.y);
        var r = scope.domElement.clientHeight / 3.0; // Size of virtual globe
        var rotAxisLocal;  // Rotational axis in virtual sphere coords
        var rDelta; // Rotational angle
        var rotAxis; // Rotational axis in camera coords

        // Exit if no change
        if (deltaMousePosition.x === 0.0 && deltaMousePosition.y === 0.0) {
            return;
        }

        if (mp.length() > r || lmp.length() > r) {
            // If outside the sphere do a pure rotation
            var dx = deltaMousePosition.x / scope.domElement.clientWidth;
            var dy = deltaMousePosition.y / scope.domElement.clientHeight;
            rDelta = 0.0;
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
            var endVecLocal = new THREE.Vector3(mp.x, mp.y, Math.sqrt(r * r - mp.x * mp.x - mp.y * mp.y));
            endVecLocal.normalize();
            var startVecLocal = new THREE.Vector3(lmp.x, lmp.y, Math.sqrt(r * r - lmp.x * lmp.x - lmp.y * lmp.y));
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
        var rMat = new THREE.Matrix4();
        rMat.makeRotationAxis(rotAxis, rDelta);
        rObject.matrix.multiply(rMat);
        rObject.rotation.setFromRotationMatrix(rObject.matrix);

        // Update view
        viewObject.notifyChange(true);
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

    this.getDirection = (() => {
        var direction = new THREE.Vector3(0, 0, -1);
        var rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        return (v) => {
            rotation.set(rObject.rotation.x, rObject.rotation.y, rObject.rotation.z);
            v.copy(direction).applyEuler(rotation);
            return v;
        };
    })();

    document.addEventListener('mousemove', this.onMouseMove, false);
    document.addEventListener('mouseup', this.onMouseUp, false);
    document.addEventListener('mousedown', this.onMouseDown, false);
    document.addEventListener('wheel', this.onMouseWheel, false);
}

export default GeoModelControls;
