import { Component, AfterViewInit, ViewEncapsulation, ViewChild, ElementRef } from '@angular/core';
import { ModelInfoService, ModelControlEventEnum } from '../../../../shared/services/model-info.service';

// Include threejs library
import * as THREE from 'three';

// Constants used to display the compass rose
const BACKGROUND_COLOUR = 0xC0C0C0;
const AXES_LENGTH = 500;
const INIT_CAMERA_POS = new THREE.Vector3(0, -7000, 7000); // Facing north at 45 degree angle to y-axis, same as model's camera
const ARROWHEAD_WIDTH = AXES_LENGTH / 7;
const ARROWHEAD_LEN = AXES_LENGTH / 5;
const FIELD_OF_VIEW = 8;
const NEAR_CLIPPING_PLANE = 1;
const FAR_CLIPPING_PLANE = 110000;

/* This component controls and displays the compass rose. To do this it creates a
   separate scene from the main view's scene. Each time the camera angle in the main view
   changes, the compass rose is changed by the same angle.
   In future this component will be extended to display a small wireframe 'overview' of the model,
   displaying the point within the models which the camera is looking at, to help orient the user.
*/
@Component({
    selector: 'app-overview',
    templateUrl: './overview.component.html',
    styleUrls: ['./overview.component.scss'],
    encapsulation: ViewEncapsulation.None // NB: Needed to style the popovers
})
export class OverviewComponent implements AfterViewInit {
    @ViewChild('canvas') private canvasRef: ElementRef;

    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;

    // Used to rotate the compass rose
    private axesObj: THREE.Object3D;
    public scene: THREE.Scene = null;

    // Has camera rotation started?
    private startRot = false;

    // Previous camera rotation angle
    private prevAngle: THREE.Euler = null;

    // Previous quaternions for the compass rose axes
    public prevQuat = {};

    // Keep the initial rotation of the axes object
    private initAxesQuat = new THREE.Quaternion();

    // Set parameters for this scene
    public fieldOfView = FIELD_OF_VIEW;
    public nearClippingPane = NEAR_CLIPPING_PLANE;
    public farClippingPane = FAR_CLIPPING_PLANE;

    // Toggle the view of the compass rose on/off
    public compassRoseActive = true;


    /**
     * Constructor
     */
    constructor(private modelInfoService: ModelInfoService) {
        this.render = this.render.bind(this);
    }


    /**
     * Creates the scene
     */
    ngAfterViewInit() {
        this.createScene();

        // Create light
        const ambient = new THREE.AmbientLight(0x404040);
        ambient.name = 'Ambient Light';
        this.scene.add(ambient);

        // Create local camera
        const aspectRatio = this.getAspectRatio();
        this.camera = new THREE.PerspectiveCamera(
            this.fieldOfView,
            aspectRatio,
            this.nearClippingPane,
            this.farClippingPane
        );

        // Set position and look at centre
        this.camera.position.copy(INIT_CAMERA_POS);
        this.camera.up.copy(new THREE.Vector3(0, 0, 1));
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        // Create renderer
        this.createRenderer();

        // First rotation not started yet
        this.startRot = false;

        // Wait for signal that main camera position/angle has changed
        const cameraPosObs = this.modelInfoService.waitForCameraPosChange();
        const local = this;
        cameraPosObs.subscribe(rot => {
            const rotEul = new THREE.Euler(rot[0], rot[1], rot[2], rot[3]);
            // First time, set the start camera angle
            if (!local.startRot) {
                local.prevAngle = rotEul;
                local.startRot = true;
            // Subsequent times, calculate the difference between the camera's start and end angles
            } else if (!local.prevAngle.equals(rotEul)) {
                // Calculate the end angle, then invert it
                const qEndInv = new THREE.Quaternion();
                qEndInv.setFromEuler(rotEul);
                qEndInv.inverse();
                // Calculate the start angle
                const qStart = new THREE.Quaternion();
                qStart.setFromEuler(local.prevAngle);
                // Calculate start angle minus end angle
                const r = qStart.multiply(qEndInv);
                // Apply this to the local axes so that they rotate to reflect the camera's change in position
                local.axesObj.quaternion.multiply(r);
                local.axesObj.updateMatrix();
                local.axesObj.updateMatrixWorld(true);
                local.prevAngle.copy(rotEul);
                // Rotate the 'N', 'S', 'E', 'W' labels
                for (const name of ['north-label', 'south-label', 'east-label', 'west-label']) {
                    const labelObj = local.scene.getObjectByName(name);
                    if (labelObj) {
                        const aq = new THREE.Quaternion();
                        aq.copy(local.axesObj.quaternion);
                        const q = new THREE.Quaternion();
                        q.copy(labelObj.parent.quaternion);
                        aq.multiply(q);
                        local.orientLabel(aq, labelObj, name);
                    }
                }
                local.render();
            }
        });
        // Wait for signal to reveal/hide the compass rose
        const compassStateObs = this.modelInfoService.waitForModelControlEvent();
        compassStateObs.subscribe(val => {
            if (val.type === ModelControlEventEnum.COMPASS_ROSE) {
                this.compassRoseActive = val.new_value;
            }
        });
        // Wait for signal that the main view was reset
        const viewResetObs = this.modelInfoService.waitForModelControlEvent();
        viewResetObs.subscribe(val => {
            if (val.type === ModelControlEventEnum.RESET_VIEW) {
                local.startRot = false;
                local.prevAngle = null;
                local.prevQuat = {};
                // Rotate compass axes back to start position
                local.axesObj.quaternion.copy(local.initAxesQuat);
                local.axesObj.updateMatrix();
                local.axesObj.updateMatrixWorld(true);
                // Make labels face camera
                for (const name of ['north-label', 'south-label', 'east-label', 'west-label']) {
                    const labelObj = local.scene.getObjectByName(name);
                    if (labelObj) {
                        const aq = new THREE.Quaternion();
                        aq.copy(local.axesObj.quaternion);
                        const q = new THREE.Quaternion();
                        q.copy(labelObj.parent.quaternion);
                        aq.multiply(q);
                        // Make letters face camera
                        local.orientLabel(aq, labelObj, name);
                    }
                }
            }
            local.render();
        });
    }

    /*
     * @returns the canvas object
     */
    private get canvas(): HTMLCanvasElement {
        return this.canvasRef.nativeElement;
    }


    /*
     * This rotates the label to face the camera
     * @param aq quaternion of label
     * @param labelObj THREE.Object3D of the label
     * @param internal name of labelObj
     */
    private orientLabel(aq: THREE.Quaternion, labelObj: THREE.Object3D, name: string) {
        // Invert the label's quaternion
        aq.inverse();
        const camPos = INIT_CAMERA_POS.clone();
        // Calculate the vector which points at the camera, relative to the label's orientation.
        // This vector is calculated by applying the label's inverted quaternion to
        // the camera's global vector.
        camPos.applyQuaternion(aq);
        labelObj.lookAt(camPos);
        labelObj.updateMatrixWorld(true);
        labelObj.updateMatrix();
        // << Orient letters up >>
        // An up facing vector in camera's coordinate system
        const cameraUp = new THREE.Vector3(0, 1, 0);
        // Convert to world coords
        this.camera.localToWorld(cameraUp);
        // Subtract camera's position, so we have camera's up vector in world coords
        cameraUp.sub(INIT_CAMERA_POS);
        // Get position of label in world coords
        const labelObjPos = new THREE.Vector3();
        labelObj.getWorldPosition(labelObjPos);
        // Add camera's up to the label's position
        // Now we know which way up the label needs to be rotated to
        labelObjPos.add(cameraUp);
        // Convert this to local coords
        labelObj.worldToLocal(labelObjPos);
        // Calculate the angle
        const angle = labelObjPos.angleTo(new THREE.Vector3(0, 1, 0));
        const qup = new THREE.Quaternion();
        // Trying to avoid the wobble that occurs around 180 degrees
        // If not almost 180 degrees, calculate quaternion to orient letter upwards
        if (angle < Math.PI * 0.95) {
            qup.setFromUnitVectors(new THREE.Vector3(0, 1, 0), labelObjPos);
            this.prevQuat[name] = qup;
        // If too close to 180 degrees use previous quaternion
        } else if (this.prevQuat[name]) {
            qup.copy(this.prevQuat[name]);
        // If no previous one, then use an approximation
        } else {
            qup.setFromUnitVectors(new THREE.Vector3(0.09987492178, 0.995, 0), labelObjPos);
        }
        labelObj.quaternion.multiply(qup);
        labelObj.updateMatrix();
    }


    /*
     * Creates a 3D label
     * @param label label string
     * @param font font object
     * @param colour colour, hex number
     * @param name, internal label for this label
     * @returns a THREE.Mesh object, which is a label
     */
    private makeAxisLabel(label, font, colour, name): THREE.Mesh {
        const textGeometry = new THREE.TextGeometry( label, {
          font: font,
          size: 80,
          height: 20,
          curveSegments: 12,
          bevelEnabled: false
        });
        const textMaterial = new THREE.MeshLambertMaterial({ color: colour });
        const mesh = new THREE.Mesh(textGeometry, textMaterial);
        mesh.name = name;
        return mesh;
    }


    /*
     * Set up the compass rose axis labels
     * @param axisObj compass rose axis object
     * @param labelObj compass rose label
     * @param name the internal name for label
     */
    private setUpLabel(axisObj: THREE.Object3D, labelObj: THREE.Object3D, name: string) {
        axisObj.add(labelObj);
        const q = new THREE.Quaternion();
        q.copy(axisObj.quaternion);
        // Make letters face camera
        this.orientLabel(q, labelObj, name);
    }


    /*
     * Creates the scene which hold the compass rose
     */
    private createScene() {
        const local = this;
        this.scene = new THREE.Scene();
        const east_dir = new THREE.Vector3(1, 0, 0);
        const west_dir = new THREE.Vector3(-1, 0, 0);
        const north_dir = new THREE.Vector3(0, 1, 0);
        const south_dir = new THREE.Vector3(0, -1, 0);
        const up_dir = new THREE.Vector3(0, 0, 1);
        const origin = new THREE.Vector3(0, 0, 0);
        this.axesObj = new THREE.Object3D();
        const eastAxis = new THREE.ArrowHelper(east_dir, origin, AXES_LENGTH, 0x00ff00, ARROWHEAD_LEN, ARROWHEAD_WIDTH);
        const westAxis = new THREE.ArrowHelper(west_dir, origin, AXES_LENGTH, 0x00ff00, ARROWHEAD_LEN, ARROWHEAD_WIDTH);
        const northAxis = new THREE.ArrowHelper(north_dir, origin, AXES_LENGTH, 0xff0000, ARROWHEAD_LEN, ARROWHEAD_WIDTH);
        const southAxis = new THREE.ArrowHelper(south_dir, origin, AXES_LENGTH, 0x00ff00, ARROWHEAD_LEN, ARROWHEAD_WIDTH);
        const upAxis = new THREE.ArrowHelper(up_dir, origin, AXES_LENGTH / 2.0, 0xffff00, ARROWHEAD_LEN, ARROWHEAD_WIDTH);
        this.axesObj.add(eastAxis);
        this.axesObj.add(westAxis);
        this.axesObj.add(northAxis);
        this.axesObj.add(southAxis);
        this.axesObj.add(upAxis);
        this.initAxesQuat.copy(this.axesObj.quaternion);
        this.scene.add(local.axesObj);

        const loader = new THREE.FontLoader();
        loader.load('assets/fonts/helvetiker_regular.typeface.json', function(font) {

          let mesh = local.makeAxisLabel('E', font, 0x00ff00, 'east-label');
          mesh.position.set(0, AXES_LENGTH * 1.2, 0);
          local.setUpLabel(eastAxis, mesh, 'east-label');

          mesh = local.makeAxisLabel('W', font, 0x00ff00, 'west-label');
          mesh.position.set(0, AXES_LENGTH * 1.2, 0);
          local.setUpLabel(westAxis, mesh, 'west-label');

          mesh = local.makeAxisLabel('N', font, 0xff0000, 'north-label');
          mesh.position.set(0, AXES_LENGTH * 1.2, 0);
          local.setUpLabel(northAxis, mesh, 'north-label');

          mesh = local.makeAxisLabel('S', font, 0x00ff00, 'south-label');
          mesh.position.set(0, AXES_LENGTH * 1.2, 0);
          local.setUpLabel(southAxis, mesh, 'south-label');
          local.render();
        });
    }


    /*
     * @returns the aspect ratio of the canvas as a float
     */
    private getAspectRatio(): number {
        const height = this.canvas.clientHeight;
        if (height === 0) {
            return 0;
        }
        return this.canvas.clientWidth / this.canvas.clientHeight;
    }


    /*
     * Creates the renderer object
     */
    private createRenderer() {
        // Set alpha = true for a transparent scene
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(devicePixelRatio);
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Set a transparent background
        this.renderer.setClearColor(BACKGROUND_COLOUR, 0);
        this.renderer.autoClear = true;

        const component: OverviewComponent = this;

        (function render() {
            component.render();
        }());
    }


    /*
     * Draws the scene
     */
    public render() {
        this.renderer.render(this.scene, this.camera);
    }
}
