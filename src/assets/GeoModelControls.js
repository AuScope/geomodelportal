
import * as THREE from 'three';
import { MAIN_LOOP_EVENTS } from '../../node_modules/itowns/lib/Core/MainLoop';

// control state
const STATE = {
    NONE: -1,
    DRAG: 0,
    PAN: 1,
    ROTATE: 2,
};

const mouseButtons = {
    LEFTCLICK: THREE.MOUSE.LEFT,
    MIDDLECLICK: THREE.MOUSE.MIDDLE,
    RIGHTCLICK: THREE.MOUSE.RIGHT,
};


function GeoModelControls(camera, view, rotCentre) {
    var scope = this;
    this.domElement = view.mainLoop.gfxEngine.renderer.domElement;
    this.rotCentre = rotCentre;

    // mouse movement
    const mousePosition = new THREE.Vector2();
    const lastMousePosition = new THREE.Vector2();
    const deltaMousePosition = new THREE.Vector2(0, 0);

    // drag movement
    const dragStart = new THREE.Vector3();
    const dragEnd = new THREE.Vector3();
    const dragDelta = new THREE.Vector3();

    var pitchObject = new THREE.Object3D();
    pitchObject.add(camera);
    camera.position.set(0.0, 0.0, 200000.0);
    this.camera = camera;
    this.rotateSpeed = 1.0;
    var viewObject = view;
    var yawObject = new THREE.Object3D();
    yawObject.add(pitchObject);
    var rollObject = new THREE.Object3D();
    rollObject.position.set(rotCentre.x, rotCentre.y, rotCentre.z);
    rollObject.add(yawObject);

    var PI_2 = Math.PI / 2;

    this.state = STATE.NONE;

    this.updateMousePositionAndDelta = function updateMousePositionAndDelta(event) {
        mousePosition.set(event.offsetX, event.offsetY);
        deltaMousePosition.copy(mousePosition).sub(lastMousePosition);
        lastMousePosition.copy(mousePosition);
    };

    this.onMouseMove = function onMouseMove(event) {
        // eslint-disable-next-line no-console
        // console.log('onMouseMove');
        event.preventDefault();

        scope.updateMousePositionAndDelta(event);

        // notify change if moving
        if (scope.state !== STATE.NONE) {
            viewObject.notifyChange(true);
        }
    };

    this.onMouseWheel = function onMouseWheel(event) {
        // eslint-disable-next-line no-console
        // console.log('onMouseWheel', event);
        event.preventDefault();
        event.stopPropagation();
        if (event.wheelDelta > 0) {
            camera.position.multiplyScalar(1.04);
        } else {
            camera.position.multiplyScalar(0.96);
        }
        // Update view
        viewObject.notifyChange(true);

        if (scope.state === STATE.NONE) {
            scope.initiateZoom(event);
        }
    };

    this.onMouseUp = function onMouseUp(event) {
        // eslint-disable-next-line no-console
        // console.log('mouseUp');
        event.preventDefault();
        scope.state = STATE.NONE;
        scope.updateMouseCursorType();
    };

    this.onMouseDown = function onMouseDown(event) {
        // eslint-disable-next-line no-console
        // console.log('mouseDown');
        event.preventDefault();

        if (scope.state === STATE.TRAVEL) {
            return;
        }

        scope.updateMousePositionAndDelta(event);

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
        document.removeEventListener('mousewheel', this.onMouseWheel, false);
    };

    this.initiateRotation = function initiateRotation() {
        // eslint-disable-next-line no-console
        // console.log('initiateRotation()', STATE.ROTATE);
        scope.state = STATE.ROTATE;
        // eslint-disable-next-line no-console
        // console.log('initiateRotation() scope.state = ', scope.state);
    };

    this.initiateDrag = function initiateDrag() {
        // eslint-disable-next-line no-console
        // console.log('initiateDrag()');
        scope.state = STATE.DRAG;
        // eslint-disable-next-line no-console
        // console.log('initiateDrag() scope.state = ', scope.state);
    };

    this.initiateZoom = function initiateZoom(event) {
        // eslint-disable-next-line no-console
        // console.log('initiateZoom()');
        let delta;

        // mousewheel delta
        if (event.wheelDelta !== undefined) {
            delta = event.wheelDelta;
        } else if (event.detail !== undefined) {
            delta = -event.detail;
        }
    };

    // Updates the view and camera if needed, and handles the animated travel
    this.update = function update(dt, updateLoopRestarted) {
        // dt will not be relevant when we just started rendering, we consider a 1-frame move in this case
        /* if (updateLoopRestarted) {
            dt = 16;
        }
        if (this.state === STATE.TRAVEL) {
            this.handleTravel(dt);
            this.view.notifyChange(true);
        } */
        if (scope.state === STATE.DRAG) {
            /* this.handleDragMovement(); */
        }
        if (scope.state === STATE.ROTATE) {
            scope.onRotate();
        }
        if (scope.state === STATE.PAN) {
            /* this.handlePanMovement(); */
        }
        deltaMousePosition.set(0, 0);
    };

    // add this GeoModelControl instance to the view's frame requesters
    // with this, GeoModelControl.update() will be called each frame
    viewObject.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE, this.update.bind(this));

    this.onRotate = function onRotate() {
        // eslint-disable-next-line no-console
        // console.log('onRotate()');

        // This translates our mouse coords into 'world coords'
        var lastMousePosition = new THREE.Vector2(0, 0);
        lastMousePosition.copy(mousePosition).sub(deltaMousePosition);
        // eslint-disable-next-line no-console
        // console.log('lastMousePosition = ', lastMousePosition);
        // eslint-disable-next-line no-console
        // console.log('mousePosition = ', mousePosition);
        var centreOffsetX = scope.domElement.clientWidth / 2.0;
        var centreOffsetY = scope.domElement.clientHeight / 2.0;
        // eslint-disable-next-line no-console
        // console.log('centreOffsetX, centreOffsetY = ', centreOffsetX, centreOffsetY);
        var mp = new THREE.Vector2(mousePosition.x - centreOffsetX, centreOffsetY - mousePosition.y);
        var lmp = new THREE.Vector2(lastMousePosition.x - centreOffsetX, centreOffsetY - lastMousePosition.y);
        var r = scope.domElement.clientHeight / 3.0;
        var rotAxisLocal;
        var rDelta;
        var rotAxis;
        var modelMat;
        var modelQuat;

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
            rotAxisLocal = new THREE.Vector3(0.0, 0.0, -1.0);
        } else {
            // eslint-disable-next-line no-console
            // console.log('current mp=', mp);

            // eslint-disable-next-line no-console
            // console.log('previous mp=', lmp);

            // If inside the sphere ...
            // Calculate start point and end point on sphere of radius r
            // Note that these are local sphere coordinates
            var endVecLocal = new THREE.Vector3(mp.x, mp.y, Math.sqrt(r * r - mp.x * mp.x - mp.y * mp.y));
            endVecLocal.normalize();
            var startVecLocal = new THREE.Vector3(lmp.x, lmp.y, Math.sqrt(r * r - lmp.x * lmp.x - lmp.y * lmp.y));
            startVecLocal.normalize();
            rotAxisLocal = endVecLocal.clone();
            // Cross product of start and end vectors on sphere gives rotational vector, in local camera coords
            rotAxisLocal.cross(startVecLocal);
            rotAxisLocal.normalize();
            // Calculate rotational angle
            rDelta = endVecLocal.angleTo(startVecLocal);
        }
        // Create a matrix to transform local camera coords to model coords
        modelMat = scope.camera.matrix.clone();
        modelMat.premultiply(pitchObject.matrix);


        // Transform rotation in local camera coords to model coords
        rotAxis = rotAxisLocal.clone();
        rotAxis.transformDirection(modelMat);
        rotAxis.normalize();

        // eslint-disable-next-line no-console
        // console.log('*** rotAxis =', rotAxis);

        // Rotate camera relative to model
        yawObject.rotation.y += rotAxis.y * rDelta;
        pitchObject.rotation.x += rotAxis.x * rDelta;
        // pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
        rollObject.rotation.z += rotAxis.z * rDelta;

        // eslint-disable-next-line no-console
        // console.log('pitchObject.rotation.x yawObject.rotation.y, rollObject.rotation.z = ', pitchObject.rotation.x, yawObject.rotation.y, rollObject.rotation.z);

        // Update view
        viewObject.notifyChange(true);
    };

    /**
    * update the cursor image according to the control state
    */
    this.updateMouseCursorType = function updateMouseCursorType() {
        switch (this.state) {
            case STATE.NONE:
                scope.domElement.style.cursor = 'auto';
                break;
            case STATE.DRAG:
                scope.domElement.style.cursor = 'move';
                break;
            case STATE.PAN:
                scope.domElement.style.cursor = 'cell';
                break;
            case STATE.ROTATE:
                scope.domElement.style.cursor = 'move';
                break;
            default:
                break;
        }
    };

    this.getObject = function getObject() {
        return rollObject;
    };

    this.getDirection = (() => {
        var direction = new THREE.Vector3(0, 0, -1);
        var rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        return (v) => {
            rotation.set(pitchObject.rotation.x, yawObject.rotation.y, rollObject.z);

            v.copy(direction).applyEuler(rotation);

            return v;
        };
    })();

    document.addEventListener('mousemove', this.onMouseMove, false);
    document.addEventListener('mouseup', this.onMouseUp, false);
    document.addEventListener('mousedown', this.onMouseDown, false);
    document.addEventListener('mousewheel', this.onMouseWheel, false);
}

export default GeoModelControls;
