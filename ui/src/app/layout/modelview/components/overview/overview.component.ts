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
const TEXT_SIZE = 400;

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
        // Introduce 'N', 'S', 'E','W' floating letters above axes
        this.axesObj.add(local.makeAxisLabel('E', new THREE.Vector3(AXES_LENGTH, 0, 50)));
        this.axesObj.add(local.makeAxisLabel('W', new THREE.Vector3(-AXES_LENGTH, 0, 50)));
        this.axesObj.add(local.makeAxisLabel('N', new THREE.Vector3(0, AXES_LENGTH, 50)));
        this.axesObj.add(local.makeAxisLabel('S', new THREE.Vector3(0, -AXES_LENGTH, 50)));
    }

    /*
     * Creates a floating label which always faces the camera
     * @param labelStr label string
     * @param offsetPosition position of label relative to the centre of compass rose
     * @returns a THREE.Sprite object, which is a floating label
     */
    private makeAxisLabel(labelStr: string, offsetPosition: THREE.Vector3): THREE.Object3D {
        // Create bitmap image
        const bitmap = document.createElement('canvas');
        // NB: 'height' and 'width' must be multiples of 2 for WebGL to render them efficiently
        bitmap.width = 512;
        bitmap.height = 256;
        const ctx = bitmap.getContext('2d');
        ctx.font = '96px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labelStr, 256, 128, 512);

        // Make a texture from bitmap
        const texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;

        // Make sprite material from texture
        const spriteMaterial = new THREE.SpriteMaterial( { map: texture, color: 0x00ff00 } );
        const sprite = new THREE.Sprite( spriteMaterial );
        // Position label to sit just above object
        sprite.position.copy(offsetPosition);
        sprite.lookAt(new THREE.Vector3());
        sprite.scale.set(TEXT_SIZE, TEXT_SIZE, 1);
        return sprite;
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
