import { Component, ViewChild, AfterViewInit, Renderer2, ElementRef, OnDestroy } from '@angular/core';
import { routerTransition } from '../../router.animations';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';

import { ModelInfoService, ModelPartCallbackType, ModelControlEventEnum,
         ModelPartStateChange, ModelPartStateChangeType } from '../../shared/services/model-info.service';
import { SidebarService, MenuChangeType, MenuStateChangeType } from '../../shared/services/sidebar.service';
import { HelpinfoService } from '../../shared/services/helpinfo.service';
import { VolView, VolviewService, DataType } from '../../shared/services/volview.service';
import { SceneObject, PlaneSceneObject, WMSSceneObject, VolSceneObject } from './scene-object';

// Include ThreeJS library
import * as THREE from 'three';

// Import itowns library
// Note: In ThreeJS, buffer geometry ids are created by incrementing a counter which is local to the library.
// So when creating objects to be added to the scene, we must always use ITOWNS' version of ThreeJS.
// If we do not do this, there will be an overlap in ids and objects are not reliably rendered to screen.
// FIXME: Needs typescript bindings
import * as ITOWNS from '../../../../node_modules/itowns/dist/itowns';

// GLTFLoader must be taken from itowns to avoid conflict as outlined above
import GLTFLoader from '../../../../node_modules/itowns/lib/ThreeExtended/loaders/GLTFLoader';

// If you want to use your own CRS instead of the ITOWNS' default one then you must use ITOWNS' version of proj4
const proj4 = ITOWNS.proj4;

// Three axis virtual globe controller
import ThreeDVirtSphereCtrls from '../../../assets/ThreeDVirtSphereCtrls';

const BACKGROUND_COLOUR = new THREE.Color(0xC0C0C0);


@Component({
    selector: 'app-modelview',
    templateUrl: './modelview.component.html',
    styleUrls: ['./modelview.component.scss'],
    animations: [routerTransition()]
})
export class ModelViewComponent  implements AfterViewInit, OnDestroy {
    @ViewChild('viewerDiv') private viewerDivElem: ElementRef;
    @ViewChild('popupBoxDiv') private popupBoxDivElem: ElementRef;
    @ViewChild('errorDiv') private errorDivElem: ElementRef;
    @ViewChild('spinnerDiv') private spinnerDivElem: ElementRef;

    // iTowns extent object
    private extentObj;

    // <div> where the 3d objects are displayed
    private viewerDiv = null;

    // <div> where popup information boxes live
    private popupBoxDiv = null;

    // View object
    private view;

    // Scene object
    private scene;

    // Nested dictionary of 'SceneObject' used by model controls div, partId is model URL
    private sceneArr: { [groupName: string]: { [partId: string]: SceneObject } };

    // Track ball controls object
    private trackBallControls = null;

    // Raycaster object
    private raycaster;

    // Mouse object
    private mouse = new THREE.Vector2();

    // Configuration object
    private config;

    // Directory where model files are kept
    private modelDir;

    // Current model's name as part if its URL
    private modelUrlPath;

    // Virtual sphere radius
    public sphereRadius = 0.0;

    // Screen centre (X,Y) in screen coords
    public centreX = 0.0;
    public centreY = 0.0;

    // Keep track of the model demostration
    public modelDemoSeqNum = -1.0;

    // Subscribe to help info service to allow model demonstrations
    private helpSubscr: Subscription;

    // Popup box that is created during sidebar help tour
    public demoPopupMsg = '';

    // itowns' tile layer
    private tileLayer = null;

    // Default distance from model to camera in metres, can be overidden in model file
    private initCamDist = 500000.0;

    // Is help dropdown collapsed or not
    public isHelpCollapsed = true;

    // Is mouse guide on/off
    public isMouseGuideOn = false;

    // Used to tell user that their browser is not supported
    private errorDiv;

    // Used to indicate that the model is loading
    private spinnerDiv;

    // FIXME: To be subsumed into a lookup service in future
    private volLabelArr: { [groupName: string]: { [partId: string]: {} } } = {};

    // Collection of 'VolView' objects, used to keep track of and display volume data
    private volViewArr: { [groupName: string]: { [partId: string]: VolView } } = {};

    constructor(private modelInfoService: ModelInfoService, private ngRenderer: Renderer2,
                private sidebarService: SidebarService, private route: ActivatedRoute, public router: Router,
                private helpinfoService: HelpinfoService, private httpService: HttpClient,
                private volViewService: VolviewService) {
        THREE.Cache.enabled = true;
    }

    /**
     * Detects WebGL
     * Adapted from: Detector.js in ThreeJS examples
     * @return true if WebGL is supported
     */
    private hasWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !! ( (<any>window).WebGLRenderingContext &&
                        ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );
        } catch ( e ) {
            return false;
        }
    }

    /**
     * Creates a WebGL error message
     * Adapted from: Detector.js in ThreeJS examples
     * @return HTML Element
     */
    private getWebGLErrorMessage() {
        const p1 = this.ngRenderer.createElement('p');
        if (!this.hasWebGL()) {
            const textStr = (<any>window).WebGLRenderingContext ? [
                'Your graphics card does not seem to support WebGL',
                'Find out how to get it '
            ].join( '\n' ) : [
                'Your browser does not seem to support WebGL',
                'Find out how to get it '
            ].join( '\n' );
            const hText = this.ngRenderer.createText(textStr);
            this.ngRenderer.appendChild(p1, hText);
            const oLink = this.ngRenderer.createElement('a');
            this.ngRenderer.setAttribute(oLink, 'href', 'http://get.webgl.org/'); // Attributes are HTML entities
            this.ngRenderer.setProperty(oLink, 'innerHTML', 'here.'); // Properties are DOM entities
            this.ngRenderer.setAttribute(oLink, 'target', '_blank');
            this.ngRenderer.setStyle(oLink, 'color', 'yellow');
            this.ngRenderer.appendChild(p1, oLink);
        }
        return p1;
    }

    /**
     * Detects IE
     * @return version of IE or false, if browser is not Internet Explorer
     */
    private detectIE() {
        const ua = window.navigator.userAgent;
        // Test values; Uncomment to check result …
        // IE 10
        // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';
        // IE 11
        // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
        // IE 12 / Spartan
        // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) '
        // 'Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';
        // Edge (IE 12+)
        // ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
        // 'Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586';
        const msie = ua.indexOf('MSIE ');
        if (msie > 0) {
            // IE 10 or older => return version number
            return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
        }
        const trident = ua.indexOf('Trident/');
        if (trident > 0) {
            // IE 11 => return version number
            const rv = ua.indexOf('rv:');
            return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        }
        return false;
    }

    /**
     * Called after the view is initialised, this code downloads the model information and kicks off
     * this process of drawing the model
     */
    ngAfterViewInit() {
        // viewerDiv is the <div> where the model is rendered
        this.viewerDiv = this.viewerDivElem.nativeElement;

        // popupBoxDiv is the <div> used for the popup information boxes
        this.popupBoxDiv = this.popupBoxDivElem.nativeElement;

        // errorDiv is used to tell user that WebGL is not supported, or IE is not supported
        this.errorDiv = this.errorDivElem. nativeElement;

        // spinnerDiv is used to indicate that the model is loading
        this.spinnerDiv = this.spinnerDivElem. nativeElement;

        // Used to access 'this' from within callback functions
        const local = this;

        // If the browser is Internet Explorer then produce a fatal warning message
        if (this.detectIE()) {
            const p1 = this.ngRenderer.createElement('p');
            const p2 = this.ngRenderer.createElement('p');
            const hText1 = this.ngRenderer.createText('Sorry - your Internet Explorer browser is not supported.  ');
            const hText2 = this.ngRenderer.createText('Please install Firefox, Chrome or Microsoft Edge');
            this.ngRenderer.appendChild(p1, hText1);
            this.ngRenderer.appendChild(p2, hText2);
            this.ngRenderer.appendChild(this.errorDiv, p1);
            this.ngRenderer.appendChild(this.errorDiv, p2);
            this.ngRenderer.setStyle(this.errorDiv, 'display', 'inline');
            return;
        }

        // Detect if webGL is available and inform viewer if cannot proceed
        if (this.hasWebGL()) {
            this.modelUrlPath = this.route.snapshot.paramMap.get('modelPath');

            // Turn on loading spinner
            this.controlLoadSpinner(true);

            // Initialise model by downloading its JSON file
            this.modelInfoService.getModelInfo(this.modelUrlPath).then(
                res => {
                    local.initialiseModel(res[0], res[1]);
                },
                errStr => {
                    const p1 = this.ngRenderer.createElement('p');
                    const p2 = this.ngRenderer.createElement('p');
                    const hText1 = this.ngRenderer.createText('Sorry - ' + errStr);
                    const hText2 = this.ngRenderer.createText('Return to home page');
                    const a1 = this.ngRenderer.createElement('a');
                    this.ngRenderer.appendChild(a1, hText2);
                    this.ngRenderer.setAttribute(a1, 'href', '/');
                    this.ngRenderer.setStyle(a1, 'color', 'yellow');
                    this.ngRenderer.appendChild(p1, hText1);
                    this.ngRenderer.appendChild(p2, a1);
                    this.ngRenderer.appendChild(this.errorDiv, p1);
                    this.ngRenderer.appendChild(this.errorDiv, p2);
                    this.ngRenderer.setStyle(this.errorDiv, 'display', 'inline');
                    this.controlLoadSpinner(false);
                    return;
                }
             );

            // Set up a callback function so this code can be informed when the sidebar controls are changed, so this code
            // can manipulate the model accordingly
            const callbackFn: ModelPartCallbackType =  function(groupName: string, partId: string, state: ModelPartStateChange) {
                if (local.sceneArr.hasOwnProperty(groupName) && local.sceneArr[groupName].hasOwnProperty(partId)) {
                    // Make a part of the model visible or invisible
                    if (state.type === ModelPartStateChangeType.DISPLAYED) {
                        local.sceneArr[groupName][partId].setVisibility(state.new_value);
                        // Also turn on/off itowns tile layer visibility if this is a WMS layer
                        if (local.sceneArr[groupName][partId] instanceof WMSSceneObject) {
                            local.tileLayer.visible = state.new_value;
                        }
                        local.view.notifyChange(true);

                    // Change the transparency of a part of the model
                    } else if (state.type ===  ModelPartStateChangeType.TRANSPARENCY) {
                        const transparency = <number> state.new_value;
                        local.sceneArr[groupName][partId].setTransparency(transparency);
                        // Also adjust itowns tile layer opacity if this is a WMS layer
                        if (local.sceneArr[groupName][partId] instanceof WMSSceneObject) {
                            local.tileLayer.opacity = transparency;
                        }
                        local.view.notifyChange(true);

                    // Move a part of the model up or down
                    } else if (state.type === ModelPartStateChangeType.HEIGHT_OFFSET) {
                        const displacement = new THREE.Vector3(0.0, 0.0, <number> state.new_value);
                        local.sceneArr[groupName][partId].setDisplacement(displacement);
                        local.view.notifyChange(true);

                    // Move a slice of a volume
                    } else if (state.type === ModelPartStateChangeType.VOLUME_SLICE) {
                        local.sceneArr[groupName][partId].setVolSlice(state.new_value[0], state.new_value[1]);
                        local.view.notifyChange(true);
                    }
                }
            };
            this.modelInfoService.registerModelPartCallback(callbackFn);
        } else {
            // Sorry, your browser or grpahics card does not have WebGL
            const warning = this.getWebGLErrorMessage();
            this.ngRenderer.appendChild(this.errorDiv, warning);
            this.ngRenderer.setStyle(this.errorDiv, 'display', 'inline');
        }
    }


    /**
      * Turns loading indication (spinner) on or off
      * @param state if true will turn loading spinner on else will turn it off
      */
    private controlLoadSpinner(state: boolean) {
        if (state) {
            this.ngRenderer.setStyle(this.spinnerDiv, 'display', 'inline');
        } else {
            this.ngRenderer.setStyle(this.spinnerDiv, 'display', 'none');
        }
    }


    /**
     * Retrieves the current dimensions of the virtual sphere
     * @return {x: centreX, y: centreY, r: radius } (centreX, centreY) are the screen coordinates and radius
     * (in pixels) of the virtual sphere used to rotate the model with the mouse
     */
    private getVirtualSphere(): {x: number, y: number, r: number} {
        if (this.trackBallControls) {
            const centre = this.trackBallControls.getVirtualSphereCentre();
            const radius = this.trackBallControls.getVirtualSphereRadius();
            return {x: centre[0], y: centre[1], r: radius};
        }
        return {x: 0.0, y: 0.0, r: 0.0};
    }

    /**
     * Returns the camera position as a set of Euler angles
     * @returns the camera position as a set of Euler angles. If the controller
     * is not initialised, then returns Euler angles of zero.
     */
    private getCameraPosition(): THREE.Euler {
        if (this.trackBallControls) {
            return this.trackBallControls.getCameraPosition();
        }
        return new THREE.Euler();
    }

    /**
     * Updates our version of the camera position
     */
    private cameraPosChange() {
        const newPos = this.getCameraPosition();
        this.modelInfoService.newCameraPos([newPos.x, newPos.y, newPos.z, newPos.order]);
    }

    /**
     * Adds a SceneObject (representing a model part) to the scene array
     * @param part
     * @param sceneObj scene object
     * @param groupName group name
     */
    private addSceneObj(part, sceneObj: SceneObject, groupName: string) {
        if (!this.sceneArr.hasOwnProperty(groupName)) {
            this.sceneArr[groupName] = {};
        }
        this.sceneArr[groupName][part.model_url] = sceneObj;
    }

    /**
     * Initialise the 'VolviewService' instance with parameters from configuration files
     * Only processes the first volume it finds
     * @param config data from model's configuration file
     * @returns true iff a volume was found else false
     */
    private initialiseVolume(config) {
        // Look for volumes
        if (config.hasOwnProperty('groups')) {
            for (const groupName in config.groups) {
                if (config.groups.hasOwnProperty(groupName)) {
                    const groupObjs = config.groups[groupName];
                    for (const groupObj of groupObjs) {
                        // Look for volumes in config file
                        if (groupObj.hasOwnProperty('type') && groupObj['type'] === '3DVolume') {
                            const volDataObj = groupObj['volumeData'];
                            if (volDataObj && groupObj.hasOwnProperty('model_url')) {
                                let dt: DataType = DataType.BIT_MASK;
                                switch (volDataObj['dataType']) {
                                    case 'BIT_MASK': dt = DataType.BIT_MASK; break;
                                    case 'INT_16': dt = DataType.INT_16; break;
                                    case 'INT_8': dt = DataType.INT_8; break;
                                    case 'FLOAT_32': dt = DataType.FLOAT_32;
                                }
                                if (!this.volViewArr.hasOwnProperty(groupName)) {
                                    this.volViewArr[groupName] = {};
                                }
                                const partId = groupObj['model_url'];
                                this.volViewArr[groupName][partId] = this.volViewService.makeVolView(volDataObj, dt);

                                // TODO: Keep this separate, this will become part of a lookup service
                                if (!this.volLabelArr.hasOwnProperty(groupName)) {
                                    this.volLabelArr[groupName] = {};
                                }
                                this.volLabelArr[groupName][partId] = volDataObj['labelLookup'];
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * This commences the process of drawing the model
     * @param config model configuration JSON
     * @param modelDir directory where model files are found
     */
    private initialiseModel(config, modelDir: string) {
        const props = config.properties;
        this.config = config;
        this.modelDir = modelDir;
        if (props.proj4_defn) {
            proj4.defs(props.crs, props.proj4_defn);
        }

        // If defined in config file, set the initial distance from model to camera
        if (props.hasOwnProperty('init_cam_dist')) {
            this.initCamDist = props.init_cam_dist;
        }
        this.initialiseVolume(config);

        // Define geographic extent: CRS, min/max X, min/max Y
        this.extentObj = new ITOWNS.Extent(props.crs, props.extent[0], props.extent[1], props.extent[2], props.extent[3]);

        this.sceneArr = {};

        // Scene
        this.scene = new THREE.Scene();

        // Grey background
        this.scene.background = BACKGROUND_COLOUR;

        // Ambient light
        const ambient = new THREE.AmbientLight(0x404040);
        ambient.name = 'Ambient Light';
        this.scene.add(ambient);

        // Add point lights from all directions to show surfaces
        const pointLightZDist = 100000;
        const pointLightXYOffset = 20000;
        const pointLightColour = 0x404040;
        const pointLightIntensity = 1.0;
        const plPosArray = [[ this.extentObj.west - pointLightXYOffset, this.extentObj.south - pointLightXYOffset, pointLightZDist ],
                            [ this.extentObj.west - pointLightXYOffset, this.extentObj.south - pointLightXYOffset, -pointLightZDist],

                            [ this.extentObj.west - pointLightXYOffset, this.extentObj.north + pointLightXYOffset, pointLightZDist],
                            [ this.extentObj.west - pointLightXYOffset, this.extentObj.north + pointLightXYOffset, -pointLightZDist],

                            [this.extentObj.east + pointLightXYOffset, this.extentObj.north + pointLightXYOffset, pointLightZDist ],
                            [this.extentObj.east + pointLightXYOffset, this.extentObj.north + pointLightXYOffset, -pointLightZDist],

                            [this.extentObj.east + pointLightXYOffset, this.extentObj.south - pointLightXYOffset, pointLightZDist ],
                            [this.extentObj.east + pointLightXYOffset, this.extentObj.south - pointLightXYOffset, -pointLightZDist ]
                            ];
        let num = 1;
        for (const plPos of plPosArray) {
            const pointlight = new THREE.PointLight(pointLightColour, pointLightIntensity);
            pointlight.position.set(plPos[0], plPos[1], plPos[2]);
            pointlight.name = 'Point Light ' + num.toString();
            this.scene.add(pointlight);
            num += 1;
        }

        // Start by adding GLTF objects
        this.add3DObjects();
    }


    /**
     * Makes a text label for a part of the model, this floats just above the model part
     * and moves around when the model part moves. Becuase it is a 'Sprite' it always faces the camera.
     * @param labelStr string label
     * @param size scale up size of label
     * @param heightOffset height in pixals that the label floats above the object
     * @returns Sprite object which can be added to the object that it labels
     */
    private makeLabel(labelStr: string, size: number, heightOffset: number): THREE.Object3D {
        // Create bitmap image
        const bitmap = document.createElement('canvas');
        // NB: 'height' and 'width' must be multiples of 2 for WebGL to render them efficiently
        bitmap.width = 1024;
        bitmap.height = 512;
        const ctx = bitmap.getContext('2d');
        ctx.font = '100px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labelStr, 512, 256, 512);

        // Make a texture from bitmap
        const texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;

        // Make sprite material from texture
        const spriteMaterial = new THREE.SpriteMaterial( { map: texture, color: 0xffffff } );
        const sprite = new THREE.Sprite( spriteMaterial );
        // Position label to sit just above object
        sprite.position.x = 0;
        sprite.position.y = 0;
        sprite.position.z = heightOffset;
        sprite.lookAt(new THREE.Vector3());
        sprite.scale.set(size, size, 1);
        return sprite;
    }


    /**
     * Makes a label for a GLTF object, that sits in the scene just above the GLTF object
     * @param sceneObj  GLTF object that must be labelled
     * @param labelStr  text label string
     * @param size scale up size of label
     * @param heightOffset height in pixals that the label floats above the object
     */
    private makeGLTFLabel(sceneObj: THREE.Object3D, labelStr: string, size: number, heightOffset: number) {
        const local = this;
        const meshObj = <THREE.Mesh> sceneObj.getObjectByProperty('type', 'Mesh');
        if (meshObj) {
            const bufferGeoObj = <THREE.BufferGeometry> meshObj.geometry;
            const arrayObj  =  bufferGeoObj.attributes.position.array;
            if (arrayObj) {
                const spriteObj = local.makeLabel(labelStr, size, heightOffset);
                spriteObj.position.x += arrayObj[0];
                spriteObj.position.y += arrayObj[1];
                spriteObj.position.z += arrayObj[2];
                sceneObj.add(spriteObj);
            }
        }
    }

    /**
     * Loads and draws the GLTF objects
     */
    private add3DObjects() {
        const manager = new ITOWNS.THREE.LoadingManager();
        const loader = new GLTFLoader(manager);
        const promiseList = [];
        const local = this;

        // Load GLTF objects into scene
        for (const group in this.config.groups) {
            if (this.config.groups.hasOwnProperty(group)) {
                const parts = this.config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'GLTFObject' && parts[i].include) {
                        promiseList.push( new Promise( function( resolve, reject ) {
                            (function(part, grp) {
                                loader.load('./assets/geomodels/' + local.modelDir + '/' + part.model_url,
                                    // function called if loading successful
                                    function (gObject) {
                                        console.log('loaded: ', local.modelDir + '/' + part.model_url);
                                        gObject.scene.name = part.model_url;
                                        if (!part.displayed) {
                                            gObject.scene.visible = false;
                                        }
                                        // Adds GLTFObject to scene
                                        local.scene.add(gObject.scene);
                                        // Makes a label for the object
                                        if (part.hasOwnProperty('is_labelled') && part['is_labelled'] === true) {
                                            local.makeGLTFLabel(gObject.scene, part.display_name, 10000, 1000);
                                        }
                                        // Adds it to the scene array to keep track of it
                                        local.addSceneObj(part, new SceneObject(gObject.scene), grp);
                                        resolve(gObject.scene);
                                    },
                                    // function called during loading
                                    function ({}) {
                                        // console.log('GLTF onProgress()', xhr);
                                        // if ( xhr.lengthComputable ) {
                                        //    const percentComplete = xhr.loaded / xhr.total * 100;
                                        //    console.log( xhr.currentTarget.responseURL, Math.round(percentComplete) + '% downloaded' );
                                        // }
                                    },
                                    // function called when loading fails
                                    function (error) {
                                         console.error('GLTF/OBJ load error!', error);
                                         // reject(null);
                                         resolve(null);
                                    }
                                );
                            })(parts[i], group);
                        }));
                    }
                }
            }
        }

        // Get a list of borehole_ids - slow to load so they are done in the background
        // NB: Use the same model name in the URL for 'api' as for the model viewing URL
        const modelName = this.modelUrlPath;
        this.modelInfoService.getBoreHoleIds(modelName).then(
            function(boreholeIdList: any[]) {
                for (const boreholeId of boreholeIdList) {
                    const params = { 'service': '3DPS',
                                    'version': '1.0',
                                    'request': 'GetResourceById',
                                    'outputFormat': 'model/gltf+json;charset=UTF-8',
                                    'resourceId' : boreholeId
                    };
                    // Load up GLTF boreholes
                    loader.load('./api/' + modelName + '?' + local.modelInfoService.buildURL(params),
                            // function called if loading successful
                            function (gObject) {
                                const groupName = 'NVCL Boreholes';
                                gObject.scene.name = 'Borehole_' + boreholeId;
                                // Add borehole to scene
                                local.scene.add(gObject.scene);
                                // Add floating label
                                local.makeGLTFLabel(gObject.scene, boreholeId, 200, 20);
                                local.addSceneObj({ 'display_name': boreholeId, 'displayed': true, 'model_url': boreholeId,
                                                          'type': 'GLTFObject' }, new SceneObject(gObject.scene), groupName);
                                local.sidebarSrvRequest(groupName, boreholeId, MenuStateChangeType.NEW_PART);
                            },
                            // function called during loading
                            function ({}) {
                                /*console.log('BOREHOLE GLTF onProgress()', xhr);
                                if ( xhr.lengthComputable ) {
                                   const percentComplete = xhr.loaded / xhr.total * 100;
                                   console.log( xhr.currentTarget.responseURL, Math.round(percentComplete) + '% downloaded' );
                               }*/
                            },
                            // function called when loading fails
                            function (error) {
                                console.log('BOREHOLE ', boreholeId, ' GLTF load error!', error);
                            }
                        );
                    } // for loop
                },
                function(err) {
                    console.log('BOREHOLE ID LIST load error!', err);
                }
        );

        Promise.all(promiseList).then(
            // function called when all objects are loaded
            function({}) {
                console.log('GLTFs are loaded');
                // Add image files to scene
                local.addPlanes();
            },
            // function called when one or more objects fail
            function(error) {
                console.error( 'Could not load all GLTFs:', error );
            });
    }

    /**
     * Adds volumes to scene (X,Y,Z slicing)
     */
    private addVolumes() {
        const promiseList = [];
        const local = this;
        for (const group in local.config.groups) {
            if (local.config.groups.hasOwnProperty(group)) {
                const parts = local.config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    // Load volume
                    if (parts[i].type === '3DVolume' && parts[i].include) {
                        const partId  = parts[i].model_url;
                        const volView = local.volViewArr[group][partId];
                        const volSceneObj  = new VolSceneObject(null, local.volViewService, volView);
                        volSceneObj.volObjList = [];
                        promiseList.push(local.volViewService.makePromise(volView, group, partId,
                                        './assets/geomodels/' + local.modelDir + '/' + parts[i].model_url,
                                        local.scene, volSceneObj.volObjList, parts[i].displayed));
                        this.addSceneObj(parts[i], volSceneObj, group);
                    }
                }
            }
        }
        Promise.all(promiseList).then(
            // function called when all objects are loaded
            function({}) {
                console.log('Volumes are loaded');
                // Finish creating scene
                local.finaliseView();
            },
            // function called when one or more objects fail
            function(error) {
                console.error( 'Could not load all volumes:', error );
            });
    }

    /**
     * This draws the planar parts of the model e.g. PNG files
     */
    private addPlanes() {
        const manager = new ITOWNS.THREE.LoadingManager();
        const local = this;
        const textureLoader = new ITOWNS.THREE.TextureLoader(manager);
        const promiseList = [];
        for (const group in local.config.groups) {
            if (local.config.groups.hasOwnProperty(group)) {
                const parts = local.config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'ImagePlane' && parts[i].include) {
                        promiseList.push( new Promise( function( resolve, reject ) {
                        (function(part, grp) {
                            textureLoader.load('./assets/geomodels/' + local.modelDir + '/' + part.model_url,
                            // Function called when download successful
                            function (textya) {
                                textya.minFilter = ITOWNS.THREE.LinearFilter;
                                const material = new ITOWNS.THREE.MeshBasicMaterial({
                                    map: textya,
                                   side: THREE.DoubleSide
                                });
                                const geometry = new ITOWNS.THREE.PlaneGeometry(local.extentObj.dimensions().x,
                                                                                local.extentObj.dimensions().y);
                                const plane = new ITOWNS.THREE.Mesh(geometry, material);
                                let z_offset = 0.0;
                                if (part.hasOwnProperty('position')) {
                                    z_offset = part.position[2];
                                }
                                const position = new THREE.Vector3(local.extentObj.center().x(),
                                                                      local.extentObj.center().y(), z_offset);
                                plane.position.copy(position);
                                plane.name =  part.model_url.substring(0, part.model_url.lastIndexOf('.')) + '_0'; // For displaying popups
                                plane.visible = part.displayed;
                                local.scene.add(plane);
                                local.addSceneObj(part, new PlaneSceneObject(plane), grp);
                                resolve(plane);
                            },
                            // Function called when download progresses
                            function ({}) {
                                // NB: Threejs does not support the progress loader
                            },
                            // Function called when download errors
                            function ({}) {
                                console.error('An error happened loading image plane');
                                reject(null);
                            }
                          );
                       })(parts[i], group);
                        }));
                    }
                }
            }
        }

        Promise.all(promiseList).then(
        // function called when all objects successfully loaded
        function({}) {
            console.log('Planes finished');
            local.addVolumes();
        },
        // function called when one GLTF object failed to load
        function(error) {
            console.error( 'Could not load all textures:', error );
        });
    }


    /**
     * Adds WMS layers to scene
     * @returns true if any layers were added
     */
    private addWMSLayers(): boolean {
        const local = this;
        const props = local.config.properties;
        // Add WMS layers
        let doneOne = false;
        for (const group in local.config.groups) {
            if (local.config.groups.hasOwnProperty(group)) {
                const parts = local.config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'WMSLayer' && parts[i].include) {
                        doneOne = true;
                        local.view.addLayer({
                            url: parts[i].model_url,
                            networkOptions: { crossOrigin: 'anonymous' },
                            type: 'color',
                            protocol: 'wms',
                            version: parts[i].version,
                            id: parts[i].id,
                            name: parts[i].name,
                            projection: props.crs,
                            options: {
                                mimetype: 'image/png',
                            },
                            updateStrategy: {
                                type: ITOWNS.STRATEGY_DICHOTOMY,
                                options: {},
                            },
                    }).then(function({}) {
                            // Retrieve WMS layer and add it to scene array
                            const allLayers = local.view.getLayers(layer => layer.id === parts[i].id);
                            if (allLayers.length > 0) {
                                local.addSceneObj(parts[i], new WMSSceneObject(allLayers[0]), group);
                            }
                        },
                        function(err) {
                            console.error('Cannot load WMS layer', err);
                        });
                    }
                }
            }
        }
        return doneOne;
    }

    /**
     * The final stage of drawing the model on screen. This is where WMS layers and XYZ axes are drawn,
     * and popup boxes are initialiseModel
     * @param config model configuration JSON
     *
     * NOTA BENE: The view objects must be added AFTER all the objects that are added to the scene directly.
     * Itowns code assumes that only its view objects have been added to the scene, and gets confused when there are
     * other objects in the scene.
     */
    private finaliseView() {
        const local = this;

        // Create an instance of PlanarView
        this.view = new ITOWNS.PlanarView(this.viewerDiv, this.extentObj, {scene3D: this.scene});

        // Change defaults to allow the camera to get very close and very far away without exceeding boundaries of field of view
        this.view.camera.camera3D.near = 0.01;
        this.view.camera.camera3D.far = 200 * Math.max(this.extentObj.dimensions().x, this.extentObj.dimensions().y);
        this.view.camera.camera3D.updateProjectionMatrix();
        this.view.camera.camera3D.updateMatrixWorld(true);

        // Disable ugly tile skirts
        const layers = this.view.getLayers();
        this.tileLayer = layers[0];
        this.tileLayer.disableSkirt = true;

        // Add WMS layers
        const doneOne = this.addWMSLayers();

        // If there are no WMS layers then disable the tile layer
        // otherwise it appears as an annoying dark blue square
        if (!doneOne) {
            this.tileLayer.visible = false;
        }

        // The Raycaster is used to find which part of the model was clicked on, then create a popup box
        this.raycaster = new THREE.Raycaster();
        this.ngRenderer.listen(this.viewerDiv, 'dblclick', function(event: any) {

                event.preventDefault();
                local.mouse.x = (event.offsetX / local.viewerDiv.clientWidth) * 2 - 1;
                local.mouse.y = -(event.offsetY / local.viewerDiv.clientHeight) * 2 + 1;

                local.raycaster.setFromCamera(local.mouse, local.view.camera.camera3D);

                const intersects  = local.raycaster.intersectObjects(local.scene.children, true);
                let closest;
                if (intersects.length > 0) {

                    // Find closest object that has a name
                    for (closest = 0; (closest < intersects.length && intersects[closest].object.name === ''); closest++) { }
                    if (closest < intersects.length) {
                        const objName = intersects[closest].object.name;
                        const objIntPt = intersects[closest].point;

                        // TODO: Remove to a separate lookup service


                        // Is this a volume object?
                        if (local.volViewService.isVolLabel(objName)) {
                            const labelBits = local.volViewService.parseVolLabel(objName);
                            const group = labelBits[0];
                            const partId = labelBits[1];
                            if (local.volViewArr.hasOwnProperty(group)) {
                                const vvArr = local.volViewArr[group];
                                if (vvArr.hasOwnProperty(partId)) {
                                    const val = local.volViewService.xyzToProp(vvArr[partId], objIntPt);
                                    let title = objName;
                                    if (val !== null) {
                                        if (objName.indexOf('|') > -1) {
                                            title = objName.split('|')[1];
                                        }
                                        const popObj = {'title': title, 'val': val };
                                        const valStr = val.toString();
                                        if (local.volLabelArr.hasOwnProperty(group) &&
                                            local.volLabelArr[group].hasOwnProperty(partId) &&
                                            local.volLabelArr[group][partId] &&
                                            local.volLabelArr[group][partId].hasOwnProperty(valStr)) {
                                            popObj['label'] = local.volLabelArr[group][partId][valStr];
                                        }
                                        local.makePopup(event, popObj, objIntPt);
                                        return;
                                    }
                                }
                            }
                        }

                        // IS there a popup or reference URL in the config?
                        for (const group in local.config.groups) {
                            if (local.config.groups.hasOwnProperty(group)) {
                                const parts = local.config.groups[group];
                                for (let i = 0; i < parts.length; i++) {
                                    // Open up the URL in a browser new window
                                    if (parts[i].hasOwnProperty('3dobject_label') &&
                                       objName === parts[i]['3dobject_label'] &&
                                       parts[i].hasOwnProperty('reference_url')) {
                                           window.open(parts[i]['reference_url']);
                                           return;
                                    //
                                    } else if (parts[i].hasOwnProperty('popups')) {
                                        for (const popup_key in parts[i]['popups']) {
                                            if (parts[i]['popups'].hasOwnProperty(popup_key)) {
                                                // console.log('popup_key = ', popup_key, ' objName = ', objName );
                                                if (popup_key === objName || popup_key + '_0' === objName ) {
                                                    local.makePopup(event, parts[i]['popups'][popup_key], objIntPt);
                                                    if (parts[i].hasOwnProperty('model_url')) {
                                                        // Open up sidebar menu to reveal relevant part
                                                        local.sidebarSrvRequest(group, parts[i]['model_url'], MenuStateChangeType.OPENED);
                                                    }
                                                    return;
                                                }
                                            }
                                        }
                                    } // hasOwnProperty('popups')
                                }
                            }
                        }

                        // If got here then, could not find it in config or volumes, so must ask server
                        const params = { 'service': '3DPS',
                            'version': '1.0',
                            'request': 'GetFeatureInfoByObjectId',
                            'format': 'application/json',
                            'layers': 'boreholes',
                            'objectId': objName
                        };
                        const modelName = local.modelUrlPath;
                        local.httpService.get('./api/' + modelName + '?' + local.modelInfoService.buildURL(params)).subscribe(
                            data => {
                                const dataResult = data as string [];
                                const attrList = dataResult['featureInfos'][0]['featureAttributeList'];
                                const queryResult = {};
                                for (const keyval of attrList) {
                                    queryResult[keyval['name']] = keyval['value'];
                                }
                                if  (queryResult.hasOwnProperty('title')) {
                                    local.makePopup(event, queryResult, objIntPt);
                                }
                            },
                            (err: HttpErrorResponse) => {
                                console.log('Cannot load borehole list', err);
                            }
                        );
                    }
                }
        });

        // 3 axis virtual globe controller
        this.trackBallControls = new ThreeDVirtSphereCtrls(this.scene, this.viewerDiv, this.view.camera.camera3D, this.view,
                                           this.extentObj.center().xyz(), this.initCamDist, this.cameraPosChange.bind(this));
        this.scene.add(this.trackBallControls.getObject());
        this.onResize(null);

        // Wait for the signal to start model demonstration
        const helpObs = this.helpinfoService.waitForModelDemo();
        this.helpSubscr = helpObs.subscribe(seqNum => { this.runModelDemo(seqNum); });

        // Wait for signal to reset the view of the model
        const viewResetObs = this.modelInfoService.waitForModelControlEvent();
        viewResetObs.subscribe(val => {
            switch (val.type) {
                case ModelControlEventEnum.RESET_VIEW:
                    this.resetModelView();
                    break;
                case ModelControlEventEnum.MOUSE_GUIDE:
                    this.isMouseGuideOn = val.new_value;
                    break;
                case ModelControlEventEnum.MOVE_VIEW:
                    this.moveViewToModelPart(val.new_value[0], val.new_value[1]);
                    break;
            }
        });
        this.view.notifyChange(true);

        // Everything except the WMS layers are loaded at this point, so turn off loading spinner
        this.controlLoadSpinner(false);
    }

    /**
     * Perform model rotation demonstration
     * @param demoState 0 = rotate along x-axis, 1 = y-axis, 2 = z-axis
     */
    public runModelDemo(demoState: number) {
        // When demo starts, reset model to initial position
        if (demoState === 0) {
            this.resetModelView();
        }
        if (this.trackBallControls) {
            this.trackBallControls.runModelRotate(demoState);
        }
        switch (demoState) {
            case 0:
                this.demoPopupMsg = 'To rotate model along vertical axis, hold down left mouse button and drag' +
                                    ' mouse horizontally through centre of mouse guide';
                break;
            case 1:
                this.demoPopupMsg = 'To rotate model along horizontal axis, hold down left mouse button and drag' +
                                    ' mouse vertically through centre of mouse guide';
                break;
            case 2:
                this.demoPopupMsg = 'To rotate model around the screen centre, hold down left mouse button and drag' +
                                    ' mouse outside of the mouse guide';
                break;
        }
        this.modelDemoSeqNum = demoState;
    }

    /**
     * Returns true iff running a model demonstration
     * @return Returns true iff running a model demonstration
     */
    public isRunningModelDemo() {
        if (this.trackBallControls) {
            return this.trackBallControls.isRunningDemo();
        }
        return false;
    }

    /**
     * Adds a text line to the popup information window
     * @param key key value
     * @param val value
     */
    private addTextLineToPopup(key: string, val: string) {
        const liElem = this.ngRenderer.createElement('li');
        const spElem = this.ngRenderer.createElement('span');
        const keyText = this.ngRenderer.createText(key + ': ');
        const valText = this.ngRenderer.createText(val);
        this.ngRenderer.appendChild(spElem, keyText);
        this.ngRenderer.appendChild(liElem, spElem);
        this.ngRenderer.appendChild(liElem, valText);
        this.ngRenderer.addClass(liElem, 'popupClass');
        this.ngRenderer.appendChild(this.popupBoxDiv, liElem);
    }

    /**
     * Capture window resize events to re-centre the display of the virtual sphere
     * @param event event object
     */
    public onResize({}) {
        const vsObj = this.getVirtualSphere();
        this.centreX = vsObj.x;
        this.centreY = vsObj.y;
        this.sphereRadius = vsObj.r;
    }

    /**
     * Make a popup box appear on the screen near where the user has queried the model
     * @param event click event
     * @param popupInfo JSON object of the information to be displayed in the popup box
     * @param point point clicked on in XYZ coordinates (format is {x: XX, y: XX, z: ZZ})
     */
    public makePopup(event, popupInfo, point: THREE.Vector3) {
        const local = this;
        // Position it and let it be seen
        this.ngRenderer.setStyle(this.popupBoxDiv, 'top', event.clientY);
        this.ngRenderer.setStyle(this.popupBoxDiv, 'left', event.clientX);
        this.ngRenderer.setStyle(this.popupBoxDiv, 'display', 'inline');
        // Empty its contents using DOM operations (Renderer2 does not currently support proper element querying)
        while (this.popupBoxDiv.hasChildNodes()) {
            this.popupBoxDiv.removeChild(this.popupBoxDiv.lastChild);
        }

        // Make 'X' for exit button in corner of popup window
        const exitDiv = this.ngRenderer.createElement('div');
        this.ngRenderer.setAttribute(exitDiv, 'id', 'popupExitDiv');  // Attributes are HTML entities
        this.ngRenderer.addClass(exitDiv, 'popupClass');
        this.ngRenderer.setProperty(exitDiv, 'innerHTML', 'X'); // Properties are DOM entities
        this.ngRenderer.setProperty(exitDiv, 'onclick', function() { local.ngRenderer.setStyle(local.popupBoxDiv, 'display', 'none'); });
        this.ngRenderer.appendChild(this.popupBoxDiv, exitDiv);
        // Make popup title
        const hText = this.ngRenderer.createText(popupInfo['title']);
        this.ngRenderer.appendChild(this.popupBoxDiv, hText);
        // Add in XYZ coordinates
        this.addTextLineToPopup('X,Y,Z (m)', point.x.toFixed(0) + ', ' + point.y.toFixed(0) + ', ' + point.z.toFixed(0));
        // Add in popup information
        for (const key in popupInfo) {
             if (key !== 'href' && key !== 'title') {
                 this.addTextLineToPopup(key, popupInfo[key]);
            // Make URLs
            } else if (key === 'href') {
                for (let hIdx = 0; hIdx < popupInfo['href'].length; hIdx++) {
                    const liElem = this.ngRenderer.createElement('li');
                    const oLink = this.ngRenderer.createElement('a');
                    this.ngRenderer.setAttribute(oLink, 'href', popupInfo['href'][hIdx]['URL']); // Attributes are HTML entities
                    this.ngRenderer.setProperty(oLink, 'innerHTML', popupInfo['href'][hIdx]['label']); // Properties are DOM entities
                    this.ngRenderer.setAttribute(oLink, 'target', '_blank');
                    this.ngRenderer.appendChild(liElem, oLink);
                    this.ngRenderer.appendChild(this.popupBoxDiv, liElem);
                }
            }
        }
    }

    /**
     * Opens up a menu item in the sidebar
     * @param groupName name of menu item's group
     * @param subGroup name of menu item's subgroup
     */
    private sidebarSrvRequest(groupName: string, subGroup: string, state: MenuStateChangeType) {
        const menuChange: MenuChangeType = { group: groupName, subGroup: subGroup, state: state };
        this.sidebarService.changeMenuState(menuChange);
    }

    /**
     * Resets the view of the model back to the starting point
     */
    private resetModelView() {
        this.trackBallControls.resetView();
        this.cameraPosChange();
    }

    /**
     * Moves view to model part
     * @param groupName name of menu item's group
     * @param subGroup name of menu item's subgroup
     */
    private moveViewToModelPart(groupName: string, subGroup: string) {
        const scope = this;
        if (this.sceneArr.hasOwnProperty(groupName) && this.sceneArr[groupName].hasOwnProperty(subGroup)) {
            const sceneObj = this.sceneArr[groupName][subGroup].sceneObj;
            let maxR = -1.0;
            let maxObj = null;
            const sumCentre = new THREE.Vector3();
            let numCentre = 0;
            const maxCentre = new THREE.Vector3(-Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER);
            const minCentre = new THREE.Vector3(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
            sceneObj.traverse(function(obj) {
                                                  // Survey geometry of object, getting mean centre and dimensions
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
                                               // Set rotation point to centre of object
                                               if (numCentre > 0) {
                                                   const point = new THREE.Vector3(sumCentre.x / numCentre, sumCentre.y / numCentre,
                                                       sumCentre.z / numCentre);
                                                   scope.trackBallControls.setRotatePoint(point);
                                               }
                                               // Adjust camera distance to the size of the object
                                               if (maxObj !== null) {
                                                   const diffCentre = new THREE.Vector3(maxCentre.x - minCentre.x,
                                                       maxCentre.y - minCentre.y, maxCentre.z - minCentre.z);
                                                   const centreRadius = diffCentre.length();
                                                   const maxRadius = Math.max(centreRadius, maxObj.geometry.boundingSphere.radius);
                                                   // Roughly set the distance according to the size of the object
                                                   let newDist = maxRadius * 3.0;
                                                   if (maxRadius < 50000) {
                                                       newDist = maxRadius * 2.5;
                                                   } else if (maxObj.geometry.boundingSphere.radius > 150000) {
                                                       newDist = maxRadius * 4.0;
                                                   }
                                                   scope.trackBallControls.adjustCamDist(newDist);
                                                   scope.cameraPosChange();
                                               }
        }
    }

    /**
     * Destroys objects and unsubscribes to ensure no memory leaks
     */
    public ngOnDestroy() {
        this.helpSubscr.unsubscribe();
    }

}
