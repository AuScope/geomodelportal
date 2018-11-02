import { Component, ViewChild, AfterViewInit, Renderer2, ElementRef, OnDestroy } from '@angular/core';
import { routerTransition } from '../../router.animations';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';

import { ModelInfoService, ModelPartCallbackType, ModelControlEvent,
         ModelPartStateChange, ModelPartStateChangeType } from '../../shared/services/model-info.service';
import { SidebarService, MenuChangeType, MenuStateChangeType } from '../../shared/services/sidebar.service';
import { HelpinfoService } from '../../shared/services/helpinfo.service';
import { VolviewService, DataType } from '../../shared/services/volview.service';

// Include threejs library
import * as THREE from 'three';

// GLTFLoader is not part of threejs' set of package exports, so we need this wrapper function
// FIXME: Needs typescript bindings
import * as GLTFLoader from '../../../../node_modules/three-gltf2-loader/lib/main';

// Import itowns library
// FIXME: Needs typescript bindings
import * as ITOWNS from '../../../../node_modules/itowns/dist/itowns';

// If you want to use your own CRS instead of the ITOWNS' default one then you must use ITOWNS' version of proj4
const proj4 = ITOWNS.proj4;

// Three axis virtual globe controller
// FIXME: Convert to typescript
import GeoModelControls from '../../../assets/GeoModelControls';

// Detects if WebGL is available in the browser
import * as Detector from '../../../../node_modules/three/examples/js/Detector';

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

    // Dictionary of {scene, checkbox, group name} objects used by model controls div, key is model URL
    private sceneArr = {};

    // Tenderer object
    private renderer;

    // Track ball controls object
    private trackBallControls = null;

    // Raycaster object
    private raycaster;

    // Mouse object
    private mouse = new THREE.Vector2();

    // Configuration object
    private config;

    // Directory where model files are kept
    private model_dir;

    // Virtual sphere radius
    private sphereRadius = 0.0;

    // Virtual sphere centre (X,Y) in screen coords
    private sphereCentreX = 0.0;
    private sphereCentreY = 0.0;

    // Keep track of the model demostration
    private modelDemoSeqNum = -1.0;

    // Subscribe to help info service to allow model demonstrations
    private helpSubscr: Subscription;

    // Subscribe to model view reset events
    private modelViewResetSubscr: Subscription;

    // Popup box that is created during sidebar help tour
    private demoPopupMsg = '';

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

    // TEMP: volume object
    private volObjList: THREE.Object3D[] = [];

    constructor(private modelInfoService: ModelInfoService, private ngRenderer: Renderer2,
                private sidebarService: SidebarService, private route: ActivatedRoute, public router: Router,
                private helpinfoService: HelpinfoService, private httpService: HttpClient,
                private volViewService: VolviewService) {
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
        if (Detector.webgl) {
            const modelUrlPath = this.route.snapshot.paramMap.get('modelPath');

            // Turn on loading spinner
            this.controlLoadSpinner(true);

            // Initialise model by downloading its JSON file
            this.modelInfoService.getModelInfo(modelUrlPath).then(
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
                    this.ngRenderer.setStyle(a1, 'color', 'blue');
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
                // Make a part of the model visible or invisible
                if (state.type === ModelPartStateChangeType.DISPLAYED) {
                    local.sceneArr[groupName][partId].visible = state.new_value;
                    // Also turn on/off tile layer visibility if this is a WMS layer
                    const parts = local.config.groups[groupName];
                    for (let i = 0; i < parts.length; i++) {
                        if (parts[i].model_url === partId && parts[i].type === 'WMSLayer') {
                            local.tileLayer.visible = state.new_value;
                        }
                    }
                    local.view.notifyChange(true);
                // Change the transparency of a part of the model
                } else if (state.type ===  ModelPartStateChangeType.TRANSPARENCY) {
                    if (local.sceneArr.hasOwnProperty(groupName) && local.sceneArr[groupName].hasOwnProperty(partId)) {
                        local.setPartTransparency(local.sceneArr[groupName][partId], <number> state.new_value);
                    } else {
                        // Volumes
                        for (const obj of local.volObjList) {
                            local.setPartTransparency(obj, <number> state.new_value);
                        }
                    }
                    local.view.notifyChange(true);
                // Move a part of the model up or down
                } else if (state.type === ModelPartStateChangeType.HEIGHT_OFFSET) {
                    const displacement = new THREE.Vector3(0.0, 0.0, <number> state.new_value);
                    if (local.sceneArr.hasOwnProperty(groupName) && local.sceneArr[groupName].hasOwnProperty(partId)) {
                        local.movePart(local.sceneArr[groupName][partId], displacement);
                    } else {
                        // Volumes
                        for (const obj of local.volObjList) {
                            // local.volViewService.changeHeight(displacement);
                            local.movePart(obj, displacement);
                        }
                    }
                    local.view.notifyChange(true);
                // Move a slice of a volume
                } else if (state.type === ModelPartStateChangeType.VOLUME_SLICE) {
                    const newSliceValList: [number, number, number] = [-1.0, -1.0, -1.0];
                    newSliceValList[state.new_value[0]] = state.new_value[1];
                    local.volObjList = local.volViewService.makeSlices(newSliceValList, local.volObjList, true);
                    local.view.notifyChange(true);
                }
            };
            this.modelInfoService.registerModelPartCallback(callbackFn);
        } else {
            // Sorry, your browser does not have WebGL
            const warning = Detector.getWebGLErrorMessage();
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
     * @return the radius of the virtual sphere used to rotate the model with the mouse, units are pixels
     */
    private getVirtualSphereRadius(): number {
        if (this.trackBallControls) {
            return this.trackBallControls.getVirtualSphereRadius();
        }
        return 0.0;
    }

    /**
     * @return the [X,Y] screen coordinates (in pixels) of the virtual sphere used to rotate the model with the mouse
     */
    private getVirtualSphereCentre(): [number, number] {
        if (this.trackBallControls) {
            return this.trackBallControls.getVirtualSphereCentre();
        }
        return [0.0, 0.0];
    }

    /**
      * Updates our version of the centre point of the model
      * used to realign the mouse guide
      */
    private updateMouseGuide() {
        const sphereCentre = this.getVirtualSphereCentre();
        this.sphereCentreX = sphereCentre[0];
        this.sphereCentreY = sphereCentre[1];
    }

    /**
     * Adds a model part to the scene array for future reference
     * @param part
     * @param sceneObj scene object
     * @param groupName group name
     */
    private addPart(part, sceneObj: THREE.Object3D, groupName: string) {
        if (!this.sceneArr.hasOwnProperty(groupName)) {
            this.sceneArr[groupName] = {};
        }
        this.sceneArr[groupName][part.model_url] = sceneObj;
    }

    /**
     * Displaces a part of the model
     * @param sceneObj the Object3D of the part
     * @param displacement a Vector3 containing the amount of displacement
     */
    private movePart(sceneObj: THREE.Object3D, displacement: THREE.Vector3) {
        // Move image object, but only if it is Object3D
        if (sceneObj.isObject3D) {
            if (sceneObj.type === 'Mesh') {
                if (!sceneObj.userData.hasOwnProperty('origPosition')) {
                    sceneObj.userData.origPosition = sceneObj.position.clone();
                }
                sceneObj.position.addVectors(sceneObj.userData.origPosition, displacement);
            } else {
                // Move GLTF object
                let found = false;
                sceneObj.traverseVisible( function(child) {
                    if (!found && child.type === 'Object3D') {
                        if (!child.userData.hasOwnProperty('origPosition')) {
                            child.userData.origPosition = child.position.clone();
                        }
                        child.position.addVectors(child.userData.origPosition, displacement);
                        found = true;
                    }
                });
            }
        } else {
            // TODO: Move itowns' WMS layers
        }
    }

    /**
     * Changes the transparency of a part of the model
     * @param sceneObj the part's Object3D or itowns layer object
     * @param value amount of transparency, a floating point number between 0.0 and 1.0
     */
    private setPartTransparency(sceneObj: any, value: number) {
        // Plane objects
        if (sceneObj.isObject3D) {
            if (sceneObj.type === 'Mesh' && sceneObj.hasOwnProperty('material')
                                   && sceneObj['material'].type === 'MeshBasicMaterial') {
                const material: THREE.MeshBasicMaterial = <THREE.MeshBasicMaterial> sceneObj['material'];
                if (value >= 0.0 && value < 1.0) {
                    material.transparent = true;
                    material.opacity = value;
                } else if (value === 1.0) {
                    material.transparent = false;
                    material.opacity = 1.0;
                }
            } else {
                // GLTF objects
                sceneObj.traverseVisible( function(child) {
                    if (child.type === 'Mesh' && child.hasOwnProperty('material')) {
                        if (child['material'].type === 'MeshStandardMaterial') {
                            const material: THREE.MeshStandardMaterial =  <THREE.MeshStandardMaterial> child['material'];
                            if (value >= 0.0 && value < 1.0) {
                                material.transparent = true;
                                material.opacity = value;
                            } else if (value === 1.0) {
                                material.transparent = false;
                                material.opacity = 1.0;
                            }
                        }
                    }
                });
            }
        // itowns' WMS layers and tile layer
        } else {
            sceneObj.opacity = value;
            this.tileLayer.opacity = value;
        }
    }

    /**
     * Initialise the 'VolviewService' instance with parameters from configuration files
     * Only processes the first volume it finds
     * @param config data from model's configuration file
     * @returns true iff a volume was found else false
     */
    private initialiseVolume(config): boolean {
        // Look for the first volume
        if (config.hasOwnProperty('groups')) {
            for (const groupName in config.groups) {
                if (config.groups.hasOwnProperty(groupName)) {
                    const groupObjs = config.groups[groupName];
                    for (const groupObj of groupObjs) {
                        if (groupObj.hasOwnProperty('type') && groupObj['type'] === '3DVolume') {
                            const volDataObj = groupObj['volumeData'];
                            if (volDataObj) {
                                let dt: DataType = DataType.BIT_MASK;
                                switch (volDataObj['dataType']) {
                                    case 'BIT_MASK': dt = DataType.BIT_MASK; break;
                                    case 'INT_16': dt = DataType.INT_16; break;
                                    case 'INT_8': dt = DataType.FLOAT_16; break;
                                    case 'FLOAT_32': dt = DataType.FLOAT_32;
                                }
                                this.volViewService.setConfig(volDataObj['dataDims'],
                                    volDataObj['origin'], volDataObj['size'], dt,
                                    volDataObj['colourLookup'], volDataObj['bitSize']);
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * This commences the process of drawing the model
     * @param config model configuration JSON
     * @param modelDir directory where model files are found
     */
    private initialiseModel(config, modelDir: string) {
        const props = config.properties;
        this.config = config;
        this.model_dir = modelDir;
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
        const plPosArray = [[ this.extentObj.west() - pointLightXYOffset, this.extentObj.south() - pointLightXYOffset, pointLightZDist ],
                            [ this.extentObj.west() - pointLightXYOffset, this.extentObj.south() - pointLightXYOffset, -pointLightZDist],

                            [ this.extentObj.west() - pointLightXYOffset, this.extentObj.north() + pointLightXYOffset, pointLightZDist],
                            [ this.extentObj.west() - pointLightXYOffset, this.extentObj.north() + pointLightXYOffset, -pointLightZDist],

                            [this.extentObj.east() + pointLightXYOffset, this.extentObj.north() + pointLightXYOffset, pointLightZDist ],
                            [this.extentObj.east() + pointLightXYOffset, this.extentObj.north() + pointLightXYOffset, -pointLightZDist],

                            [this.extentObj.east() + pointLightXYOffset, this.extentObj.south() - pointLightXYOffset, pointLightZDist ],
                            [this.extentObj.east() + pointLightXYOffset, this.extentObj.south() - pointLightXYOffset, -pointLightZDist ]
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
     * Loads and draws the GLTF objects
     */
    private add3DObjects() {
        // Note: In threeJS, buffer geometry ids are created by incrementing a counter.
        // So we are forced to use ITOWNS' version of THREE to ensure that there is no overlap in ids
        // and all objects are reliably rendered to screen
        const manager = new ITOWNS.THREE.LoadingManager();

        // This adds the 'GLTFLoader' object to 'THREE'
        GLTFLoader(ITOWNS.THREE);

        // Create our new GLTFLoader object
        const loader = new ITOWNS.THREE['GLTFLoader'](manager);
        const promiseList = [];
        const local = this;

        // Load GLTF objects into scene
        for (const group in this.config.groups) {
            if (this.config.groups.hasOwnProperty(group)) {
                const parts = this.config.groups[group];
                let doneVolume = false;
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'GLTFObject' && parts[i].include) {
                        promiseList.push( new Promise( function( resolve, reject ) {
                            (function(part, grp) {
                                loader.load('./assets/geomodels/' + local.model_dir + '/' + part.model_url,
                                    // function called if loading successful
                                    function (g_object) {
                                        console.log('loaded: ', local.model_dir + '/' + part.model_url);
                                        g_object.scene.name = part.model_url;
                                        if (!part.displayed) {
                                            g_object.scene.visible = false;
                                        }
                                        local.scene.add(g_object.scene);
                                        local.addPart(part, g_object.scene, grp);
                                        resolve(g_object.scene);
                                    },
                                    // function called during loading
                                    function ( {} ) {
                                        // console.log('GLTF onProgress()', xhr);
                                        // if ( xhr.lengthComputable ) {
                                        //    const percentComplete = xhr.loaded / xhr.total * 100;
                                        //    console.log( xhr.currentTarget.responseURL, Math.round(percentComplete) + '% downloaded' );
                                        // }
                                    },
                                    // function called when loading fails
                                    function ( xhr ) {
                                         console.error('GLTF/OBJ load error!', xhr);
                                         reject(null);
                                    }
                                );
                            })(parts[i], group);
                        }));
                    // Load volume, currently only one can be loaded
                    // TODO: Load multiple volumes of the same dimensions
                    } else if (parts[i].type === '3DVolume' && parts[i].include && !doneVolume) {
                        local.volObjList = [];
                        promiseList.push(this.volViewService.makePromise('./assets/geomodels/' + local.model_dir + '/' + parts[i].model_url,
                                                                             local.scene, local.volObjList,
                                                                             parts[i].displayed));
                        doneVolume = true;
                    }
                }
            }
        }

        // Include helper axes
        promiseList.push( new Promise( function(resolve) {
            local.addHelperAxes();
            resolve(true);
        }));

        // Get a list of borehole_ids - slow to load so they are done in the background
        this.modelInfoService.getBoreHoleIds().then(
            function(boreholeIdList: any[]) {
                console.log('GOT BH LIST', boreholeIdList);
                for (const boreholeId of boreholeIdList) {
                    // Load up GLTF boreholes
                    loader.load('./api/getBoreholeGLTF?id=' + boreholeId,
                        // function called if loading successful
                        function (g_object) {
                            console.log('loaded borehole id', boreholeId, g_object.scene);
                            g_object.scene.name = 'Borehole_' + boreholeId;
                            local.scene.add(g_object.scene);
                        },
                        // function called during loading
                        function ( xhr ) {
                            console.log('BOREHOLE GLTF onProgress()', xhr);
                            if ( xhr.lengthComputable ) {
                               const percentComplete = xhr.loaded / xhr.total * 100;
                               console.log( xhr.currentTarget.responseURL, Math.round(percentComplete) + '% downloaded' );
                            }
                        },
                        // function called when loading fails
                        function ( xhr ) {
                            console.log('BOREHOLE ', boreholeId, ' GLTF load error!', xhr);
                        }
                    );
                }

            },
            function(err) {
                console.log('BOREHOLE ID LIST load error!', err);
            }
        );

        Promise.all(promiseList).then(
            // function called when all objects are loaded
            function( {} ) {
                console.log('GLTFs are loaded');
                // Add image files to scene
                local.addPlanes();
            },
            // function called when one or more objects fail
            function( error ) {
                console.error( 'Could not load all textures:', error );
            });
    }

    /**
     * This draws the planar parts of the model e.g. PNG files
     */
    private addPlanes() {
        // Note: In threeJS, buffer geometry ids are created by incrementing a counter.
        // So we are forced to use ITOWNS' version of THREE to ensure that there is no overlap in ids
        // and all object are reliably rendered to screen
        const manager = new ITOWNS.THREE.LoadingManager();
        const local = this;
        const textureLoader = new ITOWNS.THREE.TextureLoader(manager);
        const promiseList = [];
        for (const group in this.config.groups) {
            if (this.config.groups.hasOwnProperty(group)) {
                const parts = this.config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'ImagePlane' && parts[i].include) {
                        promiseList.push( new Promise( function( resolve, reject ) {
                        (function(part, grp) {
                            textureLoader.load('./assets/geomodels/' + local.model_dir + '/' + part.model_url,
                            // Function called when download successful
                            function (textya) {
                                textya.minFilter = ITOWNS.THREE.LinearFilter;
                                const material = new ITOWNS.THREE.MeshBasicMaterial( {
                                    map: textya,
                                   side: THREE.DoubleSide
                                } );
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
                                local.addPart(part, plane, grp);
                                resolve(plane);
                            },
                            // Function called when download progresses
                            function ( {} ) {
                                // NB: Threejs does not support the progress loader
                            },
                            // Function called when download errors
                            function ( {} ) {
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
        function( {} ) {
            local.finaliseView(local.config);
        },
        // function called when one GLTF object failed to load
        function( error ) {
            console.error( 'Could not load all textures:', error );
        });
    }

    /**
     * Optionally insert some arrows to give us some orientation information
     */
    private addHelperAxes() {
        // Insert some arrows to give us some orientation information
        const x_dir = new THREE.Vector3( 1, 0, 0 );
        const y_dir = new THREE.Vector3( 0, 1, 0 );
        const z_dir = new THREE.Vector3( 0, 0, 1 );

        const origin = new THREE.Vector3( );
        origin.copy(this.extentObj.center().xyz());

        const length = 1500000.0;
        const hex_x = 0xff0000;
        const hex_y = 0x00ff00;
        const hex_z = 0x0000ff;

        const arrowHelper_x = new THREE.ArrowHelper( x_dir, origin, length, hex_x );
        arrowHelper_x.name = 'arrowHelper_x';
        this.scene.add( arrowHelper_x );
        const arrowHelper_y = new THREE.ArrowHelper( y_dir, origin, length, hex_y );
        arrowHelper_y.name = 'arrowHelper_y';
        this.scene.add( arrowHelper_y );
        const arrowHelper_z = new THREE.ArrowHelper( z_dir, origin, length, hex_z );
        arrowHelper_z.name = 'arrowHelper_z';
        this.scene.add( arrowHelper_z );
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
    private finaliseView(config) {
        const props = config.properties;
        const local = this;

        // Create an instance of PlanarView
        this.view = new ITOWNS.PlanarView(this.viewerDiv, this.extentObj, {renderer: this.renderer, scene3D: this.scene});

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
        let doneOne = false;
        for (const group in config.groups) {
            if (this.config.groups.hasOwnProperty(group)) {
                const parts = config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'WMSLayer' && parts[i].include) {
                        doneOne = true;
                        this.view.addLayer({
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
                            // Retrieve WMS layer and add it to sidebar
                            const allLayers = local.view.getLayers(layer => layer.id === parts[i].id);
                            if (allLayers.length > 0) {
                                local.addPart(parts[i], allLayers[0], group);
                            }
                        },
                        function(err) {
                            console.error('Cannot load WMS layer', err);
                        });
                    }
                }
            }
        }

        // If there are no WMS layers then disable the tile layer
        // otherwise it appears as an annoying dark blue square
        if (!doneOne) {
            this.tileLayer.visible = false;
        }

        // The Raycaster is used to find which part of the model was clicked on, then create a popup box
        this.raycaster = new THREE.Raycaster();
        this.ngRenderer.listen(this.viewerDiv, 'dblclick', function(event: any) {

                event.preventDefault();

                const modelViewObj = local;

                modelViewObj.mouse.x = (event.offsetX / local.viewerDiv.clientWidth) * 2 - 1;
                modelViewObj.mouse.y = -(event.offsetY / local.viewerDiv.clientHeight) * 2 + 1;

                modelViewObj.raycaster.setFromCamera(modelViewObj.mouse, modelViewObj.view.camera.camera3D);

                const intersects  = modelViewObj.raycaster.intersectObjects(modelViewObj.scene.children, true);

                // Look at all the intersecting objects to see that if any of them have information for popups
                if (intersects.length > 0) {
                    for (let n = 0; n < intersects.length; n++) {
                        // console.log('intersects[n].object.name = ', intersects[n].object.name);
                        if (intersects[n].object.name === '') {
                            continue;
                        }
                        for (const group in modelViewObj.config.groups) {
                            if (modelViewObj.config.groups.hasOwnProperty(group)) {
                                const parts = modelViewObj.config.groups[group];
                                for (let i = 0; i < parts.length; i++) {
                                    if (parts[i].hasOwnProperty('popups')) {
                                        for (const popup_key in parts[i]['popups']) {
                                            if (parts[i]['popups'].hasOwnProperty(popup_key)) {
                                                // console.log('popup_key = ', popup_key, popup_key.indexOf('*', popup_key.length - 1));
                                                if (popup_key + '_0' === intersects[n].object.name) {
                                                    modelViewObj.makePopup(event, parts[i]['popups'][popup_key], intersects[n].point);
                                                    if (parts[i].hasOwnProperty('model_url')) {
                                                        modelViewObj.openSidebarMenu(group, parts[i]['model_url']);
                                                    }
                                                    return;
                                                } else if (popup_key[0] === '^') {
                                                    if (intersects[n].object.name.match(popup_key)) {
                                                        modelViewObj.makePopup(event, parts[i]['popups'][popup_key], intersects[n].point);
                                                        if (parts[i].hasOwnProperty('model_url')) {
                                                            modelViewObj.openSidebarMenu(group, parts[i]['model_url']);
                                                        }
                                                        return;
                                                    }
                                                }
                                            }
                                        }
                                    // FIXME: Update config file and this so that we only use 'popups' code above
                                    } else if (parts[i].hasOwnProperty('3dobject_label') &&
                                           parts[i].hasOwnProperty('popup_info') &&
                                           intersects[n].object.name === parts[i]['3dobject_label'] + '_0') {
                                        modelViewObj.makePopup(event, parts[i]['popup_info'], intersects[n].point);
                                        if (parts[i].hasOwnProperty('model_url')) {
                                            modelViewObj.openSidebarMenu(group, parts[i]['model_url']);
                                        }
                                        return;
                                    } else if (parts[i].hasOwnProperty('3dobject_label') &&
                                           intersects[n].object.name === parts[i]['3dobject_label'] &&
                                           parts[i].hasOwnProperty('reference')) {
                                        window.open(parts[i]['reference']);
                                        return;
                                    }
                                }
                            }
                        }
                        // If got here then, could not find it locally, so must ask server
                        local.httpService.get('./api/getQuery?id=' + intersects[n].object.name).subscribe(
                            data => {
                                const queryResult = data as string [];
                                console.log('queryResult = ', queryResult);
                                modelViewObj.makePopup(event, queryResult, intersects[n].point);
                            },
                            (err: HttpErrorResponse) => {
                                console.log('Cannot load borehole list', err);
                            }
                        );
                        // Only looks at the first intersection
                        return;
                    }
                }
        });

        // 3 axis virtual globe controller
        this.trackBallControls = new GeoModelControls(this.viewerDiv, this.view.camera.camera3D, this.view,
                                           this.extentObj.center().xyz(), this.initCamDist, this.updateMouseGuide.bind(this));
        this.scene.add(this.trackBallControls.getObject());
        this.sphereRadius = this.getVirtualSphereRadius();
        const sphereCentre = this.getVirtualSphereCentre();
        this.sphereCentreX = sphereCentre[0];
        this.sphereCentreY = sphereCentre[1];

        // Wait for the signal to start model demonstration
        const helpObs = this.helpinfoService.waitForModelDemo();
        this.helpSubscr = helpObs.subscribe(seqNum => { this.runModelDemo(seqNum); });

        // Wait for signal to reset the view of the model
        const viewResetObs = this.modelInfoService.waitForModelControlEvent();
        this.modelViewResetSubscr = viewResetObs.subscribe(val => {
            if (val === ModelControlEvent.RESET_VIEW) {
                this.resetModelView();
            } else {
                this.isMouseGuideOn = (val === ModelControlEvent.MOUSE_GUIDE_ON);
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
        this.updateMouseGuide();
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
     * @param subGroupName name of menu item's subgroup
     */
    private openSidebarMenu(groupName: string, subGroup: string) {
        const menuChange: MenuChangeType = { group: groupName, subGroup: subGroup, state: MenuStateChangeType.OPENED };
        this.sidebarService.changeMenuState(menuChange);
    }

    /**
     * Resets the view of the model back to the starting point
     */
    private resetModelView() {
        this.trackBallControls.resetView();
        this.updateMouseGuide();
    }

    /**
     * Destroys objects and unsubscribes to ensure no memory leaks
     */
    public ngOnDestroy() {
        this.helpSubscr.unsubscribe();
    }

}
