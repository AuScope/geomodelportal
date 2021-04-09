import { Component, ViewChild, AfterViewInit, Renderer2, ElementRef, OnDestroy } from '@angular/core';
import { routerTransition } from '../../router.animations';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';

import { ModelInfoService, ModelPartCallbackType, ModelControlEventEnum,
         ModelPartStateChange, ModelPartStateChangeType } from '../../shared/services/model-info.service';
import { SidebarService, MenuChangeType, MenuStateChangeType } from './services/sidebar.service';
import { HelpinfoService } from './services/helpinfo.service';
import { VolView, VolviewService, DataType } from './services/volview.service';
import { SceneObject, PlaneSceneObject, WMSSceneObject, VolSceneObject, addSceneObj } from './scene-object';
import { FileImportFactory } from './components/fileimport/fileimportfactory';
import { hasWebGL, detectIE, getWebGLErrorMessage, createErrorBox, createMissingIEMsgBox, makePopup } from './html-helpers';
import { Zlib } from 'zlibjs/bin/gunzip.min.js';
import { featureEach } from '@turf/meta';
import { getCoord, getCoords, getType } from '@turf/invariant';
import { Feature, Point, LineString } from '@turf/helpers';


// Import itowns library
// Note: In ThreeJS, buffer geometry ids are created by incrementing a counter which is local to the library.
// So when creating objects to be added to the scene, we must always use ITOWNS' version of ThreeJS.
// If we do not do this, there will be an overlap in ids and objects are not reliably rendered to screen.
import * as ITOWNS from 'itowns/dist/itowns';

// GLTFLoader is not fully part of ThreeJS'. It is separate.
// We must use a GLTFLoader that is in ITOWNS' namespace, to avoid the problem described above.
// This older library works well because the namespace is an input parameter
// FIXME: Wean ourselves off this library - it is now producing errors:
// "THREE.Mesh: .drawMode has been removed. The renderer now always assumes THREE.TrianglesDrawMode. Transform your geometry via BufferGeometryUtils.toTrianglesDrawMode() if necessary."
import * as GLTFLoader from 'three-gltf2-loader/lib/main';

// If you want to use your own CRS instead of the ITOWNS' default one then you must use ITOWNS' version of proj4
const proj4 = ITOWNS.proj4;

// Three axis virtual globe controller
import ThreeDVirtSphereCtrls from '../../../assets/ThreeDVirtSphereCtrls';

const BACKGROUND_COLOUR = new ITOWNS.THREE.Color(0xC0C0C0);


@Component({
    selector: 'app-modelview',
    templateUrl: './modelview.component.html',
    styleUrls: ['./modelview.component.scss'],
    animations: [routerTransition()]
})
export class ModelViewComponent  implements AfterViewInit, OnDestroy {
    @ViewChild('viewerDiv', { static: true }) private viewerDivElem: ElementRef;
    @ViewChild('popupBoxDiv', { static: true }) private popupBoxDivElem: ElementRef;
    @ViewChild('errorDiv', { static: true }) private errorDivElem: ElementRef;
    @ViewChild('spinnerDiv', { static: true }) private spinnerDivElem: ElementRef;

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
    private mouse = new ITOWNS.THREE.Vector2();

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

    // Shared gltfLoader object
    private gltfLoader;

    // Used to create 'FileImport' object to import files into scene
    private fileImportFactory;
    private fileImport;

    // File drop is enabled
    public enableFileDrop = false;

    // Is mouse dragging a file into scene?
    private isDragging = false;
    private dragTimer;

    // Model's coordinate reference system
    public crs = 'blah';

    constructor(private modelInfoService: ModelInfoService, private ngRenderer: Renderer2,
                private sidebarService: SidebarService, private route: ActivatedRoute, public router: Router,
                private helpinfoService: HelpinfoService, private httpService: HttpClient,
                private volViewService: VolviewService) {
        ITOWNS.THREE.Cache.enabled = true;
        const manager = new ITOWNS.THREE.LoadingManager();

        // This adds the 'GLTFLoader' object to itowns' THREE
        GLTFLoader(ITOWNS.THREE);

        // Create our new GLTFLoader object
        this.gltfLoader = new ITOWNS.THREE['GLTFLoader'](manager);


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
        if (detectIE()) {
            createMissingIEMsgBox(this.ngRenderer, this.errorDiv);
            return;
        }

        // Detect if webGL is available and inform viewer if cannot proceed
        if (hasWebGL()) {
            this.modelUrlPath = this.route.snapshot.paramMap.get('modelPath');

            // Turn on loading spinner
            this.controlLoadSpinner(true);

            // Initialise model by downloading its JSON file
            this.modelInfoService.getModelInfo(this.modelUrlPath).then(
                res => {
                    local.initialiseModel(res[0], res[1]);
                },
                errStr => {
                    createErrorBox(local.ngRenderer, local.errorDiv, errStr);
                    this.controlLoadSpinner(false);
                }
             );

            // Create and register a callback function so this code can be informed when the sidebar controls are changed, so this code
            // can manipulate the model accordingly
            const callbackFn: ModelPartCallbackType =  function(groupName: string, partId: string, state: ModelPartStateChange) {
                if (local.sceneArr.hasOwnProperty(groupName) && local.sceneArr[groupName].hasOwnProperty(partId)) {
                    switch (state.type) {
                        // Make a part of the model visible or invisible
                        case ModelPartStateChangeType.DISPLAYED:
                            local.sceneArr[groupName][partId].setVisibility(state.new_value);
                            local.view.notifyChange(undefined, true);
                            break;

                        // Change the transparency of a part of the model
                        case  ModelPartStateChangeType.TRANSPARENCY:
                            const transparency = <number> state.new_value;
                            local.sceneArr[groupName][partId].setTransparency(transparency);
                            local.view.notifyChange(undefined, true);
                            break;

                        // Move a part of the model up or down
                        case ModelPartStateChangeType.HEIGHT_OFFSET:
                            const displacement = new ITOWNS.THREE.Vector3(0.0, 0.0, <number> state.new_value);
                            local.sceneArr[groupName][partId].setDisplacement(displacement);
                            local.view.notifyChange(undefined, true);
                            break;

                        // Move a slice of a volume
                        case ModelPartStateChangeType.VOLUME_SLICE:
                            local.sceneArr[groupName][partId].setVolSlice(state.new_value[0], state.new_value[1]);
                            local.view.notifyChange(undefined, true);
                            break;

                        // Rescale object in z-direction
                        case ModelPartStateChangeType.RESCALE:
                            local.sceneArr[groupName][partId].setScale(2, state.new_value);
                            local.view.notifyChange(undefined, true);
                            break;
                    }
                }
            };
            this.modelInfoService.registerModelPartCallback(callbackFn);
        } else {
            // Sorry, your browser or graphics card does not have WebGL
            const warning = getWebGLErrorMessage(this.ngRenderer);
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
    private getCameraPosition(): ITOWNS.THREE.Euler {
        if (this.trackBallControls) {
            return this.trackBallControls.getCameraPosition();
        }
        return new ITOWNS.THREE.Euler();
    }

    /**
     * Updates our version of the camera position
     */
    private cameraPosChange() {
        const newPos = this.getCameraPosition();
        this.modelInfoService.newCameraPos([newPos.x, newPos.y, newPos.z, newPos.order]);
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
                                let dt: DataType = DataType.FLOAT_32;
                                switch (volDataObj['dataType']) {
                                    case 'BIT_MASK': dt = DataType.BIT_MASK; break;
                                    case 'INT_16': dt = DataType.INT_16; break;
                                    case 'INT_8': dt = DataType.INT_8; break;
                                    case 'RGBA': dt = DataType.RGBA; break;
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
        this.crs = props.crs;

        // If defined in config file, set the initial distance from model to camera
        if (props.hasOwnProperty('init_cam_dist')) {
            this.initCamDist = props.init_cam_dist;
        }
        this.initialiseVolume(config);

        // Define geographic extent: CRS, min/max X, min/max Y
        this.extentObj = new ITOWNS.Extent(props.crs, props.extent[0], props.extent[1], props.extent[2], props.extent[3]);

        this.sceneArr = {};

        // Scene
        this.scene = new ITOWNS.THREE.Scene();

        // Grey background
        this.scene.background = BACKGROUND_COLOUR;

        // Ambient light
        const ambient = new ITOWNS.THREE.AmbientLight(0x404040);
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
            const pointlight = new ITOWNS.THREE.PointLight(pointLightColour, pointLightIntensity);
            pointlight.position.set(plPos[0], plPos[1], plPos[2]);
            pointlight.name = 'Point Light ' + num.toString();
            this.scene.add(pointlight);
            num += 1;
        }

        // Start by adding GEOJSON objects
        this.addGEOJSONPointsOrLines();
    }


    /**
     * Makes a text label for a part of the model, this floats just above the model part
     * and moves around when the model part moves. Because it is a 'Sprite' it always faces the camera.
     * @param labelStr string label
     * @param size scale up size of label
     * @param heightOffset height in pixals that the label floats above the object
     * @returns Sprite object which can be added to the object that it labels
     */
    private makeLabel(labelStr: string, size: number, heightOffset: number): ITOWNS.THREE.Object3D {
        // Create bitmap image
        const bitmap = document.createElement('canvas');
        // NB: 'height' and 'width' must be multiples of 2 for WebGL to render them efficiently
        bitmap.width = 1024;
        bitmap.height = 512;
        const ctx = bitmap.getContext('2d');
        ctx.font = '100px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labelStr, 512, 256, 1024);

        // Make a texture from bitmap
        const texture = new ITOWNS.THREE.Texture(bitmap);
        texture.needsUpdate = true;

        // Make sprite material from texture
        const spriteMaterial = new ITOWNS.THREE.SpriteMaterial( { map: texture, color: 0xffffff } );
        const sprite = new ITOWNS.THREE.Sprite( spriteMaterial );
        // Position label to sit just above object
        sprite.position.x = 0;
        sprite.position.y = 0;
        sprite.position.z = heightOffset;
        sprite.lookAt(new ITOWNS.THREE.Vector3());
        sprite.scale.set(size, size, 1);
        return sprite;
    }


    /**
     * Makes a label for a GLTF object, that sits in the scene just above the GLTF object
     * @param sceneObj  GLTF object that must be labelled
     * @param labelStr  text label string
     * @param size scale up size of label
     * @param offsetOrPos height offset in pixels that the label floats above the object, or an (x,y,z) triplet
     *                    for absolute position of label
     */
    private makeGLTFLabel(sceneObj: ITOWNS.THREE.Object3D, labelStr: string, size: number, offsetOrPos: number | [number, number, number]) {
        const local = this;
        if (typeof offsetOrPos === 'number') {
            // When given an offset, use the sceneObj's position
            const meshObj = <ITOWNS.THREE.Mesh>sceneObj.getObjectByProperty('type', 'Mesh');
            if (meshObj) {
                const bufferGeoObj = <ITOWNS.THREE.BufferGeometry>meshObj.geometry;
                const arrayObj  =  bufferGeoObj.attributes.position.array;
                if (arrayObj) {
                    const spriteObj = local.makeLabel(labelStr, size, offsetOrPos);
                    spriteObj.position.x += arrayObj[0];
                    spriteObj.position.y += arrayObj[1];
                    spriteObj.position.z += arrayObj[2];
                    sceneObj.add(spriteObj);
                }
            }
        } else {
            // When given a position
            const spriteObj = local.makeLabel(labelStr, size, 0.0);
            spriteObj.position.x += offsetOrPos[0];
            spriteObj.position.y += offsetOrPos[1];
            spriteObj.position.z += offsetOrPos[2];
            sceneObj.add(spriteObj);
        }
    }

    /**
     * GZipped GEOJSON (GZSON)
     * This allows adding of hundreds of thousands of points or lines to scene.
     * Displaying such large numbers of items is not feasible Using GLTF rectangles (pairs of triangles)
     * And, unfortunately GLTF 2.0 does not fully specify points and lines
     * (https://github.com/KhronosGroup/glTF/issues/1277)
     * So I have to send the data in compressed format and draw my own lines and points
     */
    private addGEOJSONPointsOrLines() {
        const promiseList = [];
        const local = this;

        // Load geojson objects into scene
        for (const group in this.config.groups) {
            if (this.config.groups.hasOwnProperty(group)) {
                const parts = this.config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    console.log("parts[i].type=", parts[i].type);
                    if (parts[i].type === 'GZSON' && parts[i].include) {
                        promiseList.push( new Promise( function( resolve, _reject ) {
                            (function(part, grp) {
                                console.log('loading: ', local.modelDir + '/' + part.model_url);
                                local.httpService.get('./assets/geomodels/' + local.modelDir + '/' + part.model_url, { responseType: 'arraybuffer' }).subscribe(
                                    // function called if loading successful
                                    function (gzsonObject) {
                                        console.log('loaded: ', local.modelDir + '/' + part.model_url);
                                        const view = new Uint8Array(gzsonObject);
                                        const gunzip = new Zlib.Gunzip(view);
                                        const plain = gunzip.decompress();
                                        const str = new TextDecoder("utf-8").decode(plain);
                                        const featureColl = JSON.parse(str);
                                        const geometry = new ITOWNS.THREE.BufferGeometry();
                                        let material = null;
                                        let items = null;

                                        // Is is a collection of points or lines?
                                        if (featureColl['features'].length > 0) {
                                            // Points
                                            if (getType(featureColl['features'][0]) === 'Point') {
                                                const ptList = [];
                                                const colList = [];
                                                const col = new ITOWNS.THREE.Color();
                                                featureEach(featureColl, function(feat: Feature<Point>, idx) {
                                                    const coord = getCoord(feat);
                                                    const col_tup = feat['properties']['colour'];
                                                    if (col_tup !== undefined) {
                                                        col.setRGB(col_tup[0], col_tup[1], col_tup[2]);
                                                        ptList.push(coord[0], coord[1], coord[2]);
                                                        colList.push(col.r, col.g, col.b);
                                                    }
                                                });
                                                geometry.setAttribute('position', new ITOWNS.THREE.Float32BufferAttribute(ptList, 3));
                                                geometry.setAttribute('color', new ITOWNS.THREE.Float32BufferAttribute(colList, 3));
                                                geometry.computeBoundingSphere();
                                                material = new ITOWNS.THREE.PointsMaterial({size: 500, vertexColors: true});
                                                items = new ITOWNS.THREE.Points(geometry, material);
                                            // LineString
                                            } else {
                                                const lnList = [];
                                                const colList = [];
                                                const indices = [];
                                                const col = new ITOWNS.THREE.Color();
                                                featureEach(featureColl, function(feat: Feature<LineString>, idx) {
                                                    const coords = getCoords(feat);
                                                    const col_tup = feat['properties']['colour'];
                                                    if (col_tup !== undefined) {
                                                        col.setRGB(col_tup[0], col_tup[1], col_tup[2]);
                                                        lnList.push(coords[0][0], coords[0][1], coords[0][2], coords[1][0], coords[1][1], coords[1][2]);
                                                        colList.push(col.r, col.g, col.b);
                                                        colList.push(col.r, col.g, col.b);
                                                        indices.push(2*idx, 2*idx+1);
                                                    }
                                                });
                                                geometry.setIndex(indices);
                                                geometry.setAttribute('position', new ITOWNS.THREE.Float32BufferAttribute(lnList, 3));
                                                geometry.setAttribute('color', new ITOWNS.THREE.Float32BufferAttribute(colList, 3));
                                                material = new ITOWNS.THREE.LineBasicMaterial({vertexColors: true, morphTargets: true});
                                                items = new ITOWNS.THREE.LineSegments(geometry, material);
                                            }
                                            local.scene.add(items);
                                            // Adds it to the scene array to keep track of it
                                            addSceneObj(local.sceneArr, part, new SceneObject(items), grp);
					} else {
                                            console.warn(local.modelDir + '/' + part.model_url, 'is empty');
					}
                                        resolve(items);
                                    },
                                    // function called during loading
                                    //function () {
                                        // console.log('GLTF onProgress()', xhr);
                                        // if ( xhr.lengthComputable ) {
                                        //    const percentComplete = xhr.loaded / xhr.total * 100;
                                        //    console.log( xhr.currentTarget.responseURL, Math.round(percentComplete) + '% downloaded' );
                                        // }
                                    //},
                                    // function called when loading fails
                                    function (error) {
                                         console.error('GZSON load error!', error);
                                         // Accept errors
                                         resolve(null);
                                    }
                                );
                            })(parts[i], group);
                        }));
                    }
                }
            }
        }

        Promise.all(promiseList).then(
            // function called when all objects are loaded
            function() {
                console.log('GZSONs are loaded');
                // Add image files to scene
                local.add3DObjects();
            },
            // function called when one or more objects fail
            function(error) {
                console.error( 'Could not load all GLTFs:', error );
            });
    }



    /**
     * Loads and draws the GLTF objects
     */
    private add3DObjects() {
        const promiseList = [];
        const local = this;

        // Load GLTF objects into scene
        for (const group in this.config.groups) {
            if (this.config.groups.hasOwnProperty(group)) {
                const parts = this.config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'GLTFObject' && parts[i].include) {
                        promiseList.push( new Promise( function( resolve, _reject ) {
                            (function(part, grp) {
                                local.gltfLoader.load('./assets/geomodels/' + local.modelDir + '/' + part.model_url,
                                    // function called if loading successful
                                    function (gObject) {
                                        console.log('loaded: ', local.modelDir + '/' + part.model_url);
                                        gObject.scene.name = part.model_url;
                                        if (!part.displayed) {
                                            gObject.scene.visible = false;
                                        }

                                        // Object styling
                                        if (part.hasOwnProperty('styling')) {
                                            // Scales the object in z-direction
                                            let sc = 1.0;
                                            if (part.styling.hasOwnProperty('scale')) {
                                                sc = part.styling.scale;
                                                gObject.scene.scale.setComponent(2, sc);
                                            }

                                            if (part.styling.hasOwnProperty('labels')) {
                                                for (const label of part.styling.labels) {

                                                    // Makes a label for the object
                                                    let display_name = part.display_name;
                                                    if (label.hasOwnProperty('display_name')) {
                                                        display_name = label.display_name;
                                                    }
                                                    if (label.hasOwnProperty('position')) {
                                                        local.makeGLTFLabel(gObject.scene, display_name, sc * 3000,
                                                                            label.position);
                                                    } else {
                                                        local.makeGLTFLabel(gObject.scene, display_name, sc * 3000,
                                                                            300);
                                                    }
                                                }
                                            }
                                        }

                                        // Adds GLTFObject to scene
                                        local.scene.add(gObject.scene);

                                        // Adds it to the scene array to keep track of it
                                        addSceneObj(local.sceneArr, part, new SceneObject(gObject.scene), grp);
                                        resolve(gObject.scene);
                                    },
                                    // function called during loading
                                    function () {
                                        // console.log('GLTF onProgress()', xhr);
                                        // if ( xhr.lengthComputable ) {
                                        //    const percentComplete = xhr.loaded / xhr.total * 100;
                                        //    console.log( xhr.currentTarget.responseURL, Math.round(percentComplete) + '% downloaded' );
                                        // }
                                    },
                                    // function called when loading fails
                                    function (error) {
                                         console.error('GLTF/OBJ load error!', error);
                                         // Accept errors
                                         resolve(null);
                                    }
                                );
                            })(parts[i], group);
                        }));
                    }
                }
            }
        }

        Promise.all(promiseList).then(
            // function called when all objects are loaded
            function() {
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
     * Loads all the boreholes in the background
     */
    private addBoreholes() {
        const local = this;

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
                    local.gltfLoader.load('./api/' + modelName + '?' + local.modelInfoService.buildURL(params),
                        // function called if loading successful
                        function (gObject) {
                            const groupName = 'NVCL Boreholes';
                            gObject.scene.name = 'Borehole_' + boreholeId;
                            // Add borehole to scene
                            local.scene.add(gObject.scene);
                            // Add floating label
                            local.makeGLTFLabel(gObject.scene, boreholeId, 200, 20);
                            addSceneObj(local.sceneArr, { 'display_name': boreholeId, 'displayed': true, 'model_url': boreholeId,
                                                        'type': 'GLTFObject' }, new SceneObject(gObject.scene), groupName);
                            local.sidebarSrvRequest(groupName, boreholeId, MenuStateChangeType.NEW_PART);
                        },
                        // function called during loading
                        function () {
                            /*console.log('BOREHOLE GLTF onProgress()', xhr);
                            if ( xhr.lengthComputable ) {
                                const percentComplete = xhr.loaded / xhr.total * 100;
                                console.log( xhr.currentTarget.responseURL, Math.round(percentComplete) + '% downloaded' );
                            }*/
                        },
                        // function called when loading fails
                        function (error) {
                            console.error('BOREHOLE ', boreholeId, ' GLTF load error!', error);
                        }
                    );
                } // for loop
            },
            function(err) {
                console.error('BOREHOLE ID LIST load error!', err);
            }
        );
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
                        addSceneObj(this.sceneArr, parts[i], volSceneObj, group);
                    }
                }
            }
        }
        Promise.all(promiseList).then(
            // function called when all objects are loaded
            function() {
                console.log('Volumes are loaded');
                // Finish creating scene
                local.createView();
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
                                   side: ITOWNS.THREE.DoubleSide
                                });
                                const geometry = new ITOWNS.THREE.PlaneGeometry(local.extentObj.dimensions().x,
                                                                                local.extentObj.dimensions().y);
                                const plane = new ITOWNS.THREE.Mesh(geometry, material);
                                let z_offset = 0.0;
                                if (part.hasOwnProperty('position')) {
                                    z_offset = part.position[2];
                                }
                                const position = new ITOWNS.THREE.Vector3(local.extentObj.center().x,
                                                                      local.extentObj.center().y, z_offset);
                                plane.position.copy(position);
                                plane.name =  part.model_url.substring(0, part.model_url.lastIndexOf('.')) + '_0'; // For displaying popups
                                plane.visible = part.displayed;
                                local.scene.add(plane);
                                addSceneObj(local.sceneArr, part, new PlaneSceneObject(plane), grp);
                                resolve(plane);
                            },
                            // Function called when download progresses
                            function () {
                                // NB: Threejs does not support the progress loader
                            },
                            // Function called when download errors
                            function () {
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
        function() {
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
     * NB: Currently only adds one layer
     */
    private addWMSLayers() {
        const local = this;
        const promiseList = [];
        for (const group in local.config.groups) {
            if (local.config.groups.hasOwnProperty(group)) {
                const parts = local.config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'WMSLayer' && parts[i].include) {
                        promiseList.push( new Promise(function(resolve, reject) {
                            (function(part, grp) {
                                local.addWMSLayer(part.model_url, part.name, part.version);
                                resolve([part, grp]);
                            })(parts[i], group);
                        }));
                        // For the moment only load first one
                        break;
                    }
                }
            }
        }
        if (promiseList.length > 0) {
            Promise.all(promiseList).then(
                // function called when all objects successfully loaded
                function(pg) {
                    // Only process the first WMS layer
                    const part = pg[0][0];
                    const group = pg[0][1];
                    // Retrieve WMS layer and add its parent to scene array
                    // Adding parent controls visibility and transparency of base layer at same time
                    // Assumes one layer visible at a time.
                    const layer = local.view.getLayerById(part.name);
                    if (layer && layer.parent) {
                        addSceneObj(local.sceneArr, part, new WMSSceneObject(layer.parent), group);
                    } else {
                        console.error('Cannot find loaded WMS layer', part.name);
                    }
                    local.finaliseScene();
                },
                // function called when one GLTF object failed to load
                function(error) {
                    console.error('Cannot load WMS layer', error);
                }
            );
        } else {
            // When there is no WMS layer, only a blue base layer is shown, so remove it
            const planarLayer = local.view.getLayerById('planar');
            planarLayer.visible = false;
            local.finaliseScene();
        }
    }

    /**
     * Add a WMS layer
     * @param url URL for the WMS layer (string)
     * @param name name of WMS layer (string)
     * @param version version (string)
     * NB: itowns only supports a limited number of WMS CRS, but converts to local CRS on the fly
     */
    private addWMSLayer(url: string, name: string, version: string) {
        const local = this;

        // Create the source
        const wmsSource = new ITOWNS.WMSSource({
            name: name,
            url: 'api/tas/wmsproxy/default?wmsUrl=' + url,
            version: version,
            projection: 'EPSG:3857',
            format: 'image/png',
            extent: local.extentObj,
            transparent: 'true'
        });

        // Create the layer
        const colorlayer = new ITOWNS.ColorLayer(name, {
            updateStrategy: {
                type: ITOWNS.STRATEGY_DICHOTOMY,
                options: {},
            },
            source: wmsSource,
            transparent: true
        });

        // Add the layer
        local.view.addLayer(colorlayer);
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
    private createView() {
        // Create an instance of PlanarView
        this.view = new ITOWNS.PlanarView(this.viewerDiv, this.extentObj, {scene3D: this.scene, maxSubdivisionLevel: 2.0,
                                                                           disableSkirt: true});

        // Change defaults to allow the camera to get very close and very far away without exceeding boundaries of field of view
        this.view.camera.camera3D.near = 0.01;
        this.view.camera.camera3D.far = 200 * Math.max(this.extentObj.dimensions().x, this.extentObj.dimensions().y);
        this.view.camera.camera3D.updateProjectionMatrix();
        this.view.camera.camera3D.updateMatrixWorld(true);

        this.addWMSLayers();
    }


    /**
     * Adds the final elements to the scene e.g mouse controls, file import handler
     */
    private finaliseScene() {
        const local = this;

        this.addBoreholes();

        // The Raycaster is used to find which part of the model was clicked on, then create a popup box
        this.raycaster = new ITOWNS.THREE.Raycaster();
        this.ngRenderer.listen(this.viewerDiv, 'dblclick', function(event: any) {

                event.preventDefault();
                local.mouse.x = (event.offsetX / local.viewerDiv.clientWidth) * 2 - 1;
                local.mouse.y = -(event.offsetY / local.viewerDiv.clientHeight) * 2 + 1;

                local.raycaster.setFromCamera(local.mouse, local.view.camera.camera3D);

                const intersects = local.raycaster.intersectObjects(local.scene.children, true);
                let closest;
                if (intersects.length > 0) {

                    // Find closest object that has a name
                    for (closest = 0; (closest < intersects.length && intersects[closest].object.name === ''); closest++) { }
                    if (closest < intersects.length) {
                        const objName = intersects[closest].object.name;
                        const objIntPt = intersects[closest].point;
                        const point: [number, number, number] = [ objIntPt.x, objIntPt.y, objIntPt.z];

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
                                        makePopup(local.ngRenderer, local.popupBoxDiv, event, popObj, point);
                                        return;
                                    }
                                }
                            }
                        }

                        // Is there a popup or reference URL in the config?
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
                                                    makePopup(local.ngRenderer, local.popupBoxDiv, event,
                                                              parts[i]['popups'][popup_key], point);
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
                                    makePopup(local.ngRenderer, local.popupBoxDiv, event, queryResult, point);
                                }
                            },
                            (err: HttpErrorResponse) => {
                                console.error('Cannot load borehole list', err);
                            }
                        );
                    }
                }
        });

        // 3 axis virtual globe controller
        this.trackBallControls = new ThreeDVirtSphereCtrls(this.scene, this.viewerDiv, this.view.camera.camera3D, this.view,
                                        this.extentObj.center().toVector3(), this.initCamDist, this.cameraPosChange.bind(this));
        this.onResize();

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
        this.view.notifyChange(this.view.camera.camera3D, true);

        // Set up drag and drop file display mechanism
        this.fileImportFactory = new FileImportFactory(this.sidebarService, this.modelInfoService, this.httpService);
        this.fileImport = this.fileImportFactory.createFileImport(this.scene, this.gltfLoader, this.modelUrlPath,
                                                                             this.sceneArr, this.trackBallControls);
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
     * Capture window resize events to re-centre the display of the virtual sphere
     * @param event event object
     */
    public onResize() {
        const vsObj = this.getVirtualSphere();
        this.centreX = vsObj.x;
        this.centreY = vsObj.y;
        this.sphereRadius = vsObj.r;
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
        if (this.sceneArr.hasOwnProperty(groupName) && this.sceneArr[groupName].hasOwnProperty(subGroup)) {
            const sceneObj = this.sceneArr[groupName][subGroup].sceneObj;
            if (this.trackBallControls.moveViewToObj(sceneObj)) {
                this.cameraPosChange();
            }
        }
    }

    /**
     * Checks that the user is dragging a file into scene
     */
    private checkDragging() {
        if (!this.isDragging) {
            this.enableFileDrop = false;
            clearInterval(this.dragTimer);
            this.dragTimer = null;
        }
        this.isDragging = false;
    }

    /**
     * When dragging a file to be converted to glTF into the scene
     * prevent default behavior (stop file being opened)
     * and enable on screen instructions
     * @param ev event object
     */
    public dragEnterHandler(ev) {
        ev.preventDefault();
        this.enableFileDrop = true;
    }

    /**
     * When dragging a file to be converted to glTF,
     * prevent default behavior (stop file being opened)
     * @param ev event object
     */
    public preventDefault(ev) {
        // Prevent default behaviour (stop file being opened)
        ev.preventDefault();
        this.isDragging = true;
        if (!this.dragTimer) {
            this.dragTimer = setInterval(this.checkDragging.bind(this), 1000);
        }
    }

    /**
     * When a GOCAD file is droppped into the square, it is converted, then loaded into the scene
     * @param ev event object
     **/
    public dropHandler(ev) {
        // Prevent default behaviour (stop file being opened)
        ev.preventDefault();
        this.fileImport.doTryConvert(ev);
        this.enableFileDrop = false;
    }

    /**
     * Destroys objects and unsubscribes to ensure no memory leaks
     */
    public ngOnDestroy() {
        this.helpSubscr.unsubscribe();
    }

}
