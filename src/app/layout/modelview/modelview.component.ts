import { Component } from '@angular/core';
import { routerTransition } from '../../router.animations';
import { ModelInfoService, ModelPartCallbackType,
         ModelPartStateChange, ModelPartStateChangeType } from '../../shared/services/model-info.service';

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
// FIXME: Needs typescript bindings
import GeoModelControls from '../../../assets/GeoModelControls';

// Detects if WebGL is available in the browser
import * as Detector from '../../../../node_modules/three/examples/js/Detector';


@Component({
    selector: 'app-modelview',
    templateUrl: './modelview.component.html',
    styleUrls: ['./modelview.component.scss'],
    animations: [routerTransition()]
})
export class ModelViewComponent {
    // iTowns extent object
    private extentObj;

    // div where the 3d objects are displayed
    private viewerDiv;

    // view object
    private view;

    // scene object
    private scene;

    // Dictionary of {scene, checkbox, group name} objects used by model controls div, key is model URL
    private sceneArr = {};

    //
    private ulElem;

    // camera object
    private camera;

    // renderer object
    private renderer;

    // track ball controls object
    private trackBallControls;

    // raycaster object
    private raycaster;

    // mouse object
    private mouse = new THREE.Vector2();

    // configuration object
    private config;

    // directory where model files are kept
    private model_dir;

    constructor(private modelInfoService: ModelInfoService) {
        const exports = {};
        const local = this;

        // Detect if webGL is available and inform viewer if cannot proceed
        if (Detector.webgl) {
            const params = new URLSearchParams(document.location.search.substring(1));
            const model_name = 'NorthGawler';  // FIXME: should eventually be params.get('model');
            // Initialise model by downloading its JSON file
            this.modelInfoService.getModelInfo(model_name).then(res => { local.initialise_model(res, model_name); });
            const callbackFn: ModelPartCallbackType =  function(groupName: string, modelUrl: string, state: ModelPartStateChange) {
                if (state.type === ModelPartStateChangeType.DISPLAYED) {
                    local.sceneArr[groupName][modelUrl].visible = state.new_value;
                    local.view.notifyChange(true);
                }
            };
            this.modelInfoService.registerModelPartCallback(callbackFn);
        } else {
            const warning = Detector.getWebGLErrorMessage();
            // FIXME: Do this the angular way
            document.getElementById('viewerDiv').appendChild(warning);
        }
    }

    add_part(part, sceneObj, groupName) {
        if (!this.sceneArr.hasOwnProperty(groupName)) {
            this.sceneArr[groupName] = {};
        }
        this.sceneArr[groupName][part.model_url] = sceneObj;
    }

    initialise_model(config, model_name) {
        const props = config.properties;
        const i = 0;
        console.log('config =', config, model_name);
        this.config = config;
        this.model_dir = model_name;
        if (props.proj4_defn) {
            proj4.defs(props.crs, props.proj4_defn);
        }

        // Define geographic extent: CRS, min/max X, min/max Y
        // Model boundary according to the North Gawler Province Metadata PDF using projection: UTM Zone 52 Datum: GDA94 => EPSG:28352
        this.extentObj = new ITOWNS.Extent(props.crs, props.extent[0], props.extent[1], props.extent[2], props.extent[3]);

        // `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
        this.viewerDiv = document.getElementById('viewerDiv');

        this.sceneArr = {};

        // Scene
        this.scene = new ITOWNS.THREE.Scene();

        /*var axesHelper = new THREE.AxisHelper( 5 );
        scene.add( axesHelper );*/

        // Grey background
        this.scene.background = new THREE.Color(0x555555);

        // Ambient light
        const ambient = new ITOWNS.THREE.AmbientLight(0xFFFFFF);
        ambient.name = 'Ambient Light';
        this.scene.add(ambient);

        // Point light
        const pointlight = new THREE.PointLight();
        pointlight.position.set(this.extentObj.west(), this.extentObj.south(), 400000);
        pointlight.name = 'Point Light';
        this.scene.add(pointlight);

        this.add_3dobjects();
    }

    // Add GLTF objects
    add_3dobjects() {
        const manager = new ITOWNS.THREE.LoadingManager();

        // This adds the 'GLTFLoader' object to 'THREE'
        GLTFLoader(THREE);

        // Create our new GLTFLoader object
        const loader = new THREE['GLTFLoader'](manager);

        const onProgress = function ( xhr ) {
            // console.log('GLTF/OBJ onProgress()', xhr);
            // if ( xhr.lengthComputable ) {
            //    const percentComplete = xhr.loaded / xhr.total * 100;
            //    console.log( xhr.currentTarget.responseURL, Math.round(percentComplete) + '% downloaded' );
            // }
        };
        const onError = function ( xhr ) {
            console.log('GLTF/OBJ load error!', xhr);
        };

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
                                loader.load('./assets/geomodels/' + local.model_dir + '/' + part.model_url, function (g_object) {
                                    console.log('loaded: ', local.model_dir + '/' + part.model_url);
                                    g_object.scene.name = part.model_url;
                                    if (!part.displayed) {
                                        g_object.scene.visible = false;
                                    }
                                    local.scene.add(g_object.scene);
                                    local.add_part(part, g_object.scene, grp);
                                    resolve(g_object.scene);
                                }, onProgress, onError);
                            })(parts[i], group);
                        }));
                    }
                }
            }
        }

        Promise.all(promiseList).then( function( sceneObjList ) {
           console.log('GLTFs are loaded, now init view scene=', local.scene);
           local.add_planes();
        }, function( error ) {
            console.error( 'Could not load all textures:', error );
        });
    }


    add_planes() {
        // Add planes
        const manager = new ITOWNS.THREE.LoadingManager();
        manager.onProgress = function ( item, loaded, total ) {
            // console.log( item, loaded, total );
        };

        const local = this;

        const textureLoader = new THREE.TextureLoader(manager);

        const promiseList = [];
        for (const group in this.config.groups) {
            if (this.config.groups.hasOwnProperty(group)) {
                const parts = this.config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'ImagePlane' && parts[i].include) {
                        promiseList.push( new Promise( function( resolve, reject ) {
                        (function(part, grp) {
                          const texture = textureLoader.load('./assets/geomodels/' + local.model_dir + '/' + part.model_url,
                            function (textya) {
                                textya.minFilter = THREE.LinearFilter;
                                const material = new THREE.MeshBasicMaterial( {
                                    map: textya,
                                   side: THREE.DoubleSide
                                } );
                                const geometry = new THREE.PlaneGeometry(local.extentObj.dimensions().x, local.extentObj.dimensions().y);
                                const plane = new THREE.Mesh(geometry, material);
                                const position = new ITOWNS.THREE.Vector3(local.extentObj.center().x(),
                                                                      local.extentObj.center().y(), part.position[2]);
                                plane.position.copy(position);
                                plane.name = part.display_name; // Need this to display popup windows
                                local.scene.add(plane);
                                local.add_part(part, plane, grp);
                                resolve(plane);
                            },
                            // Function called when download progresses
                            function ( xhr ) {
                                // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                            },
                            // Function called when download errors
                            function ( xhr ) {
                                console.error('An error happened loading image plane');
                            }
                          );
                       })(parts[i], group);
                        }));
                    }
                }
            }
        }

        Promise.all(promiseList).then( function( sceneObjList ) {
           // Planes are loaded, now for GLTF objects
           local.initialise_view(local.config);

        }, function( error ) {
            console.error( 'Could not load all textures:', error );
        });
    }

    // NOTA BENE: The view objects must be added AFTER all the objects that are added to the scene directly.
    // Itowns code assumes that only its view objects have been added to the scene, and gets confused when there are
    // other objects in the scene.
    //
    initialise_view(config) {
        const props = config.properties;

        // Create an instance of PlanarView
        this.view = new ITOWNS.PlanarView(this.viewerDiv, this.extentObj, {near: 0.001, renderer: this.renderer, scene3D: this.scene});

        // Change defaults to allow the camera to get very close and very far away without exceeding boundaries of field of view
        this.view.camera.camera3D.near = 0.01;
        this.view.camera.camera3D.far = 200 * Math.max(this.extentObj.dimensions().x, this.extentObj.dimensions().y);
        this.view.camera.camera3D.updateProjectionMatrix();
        this.view.camera.camera3D.updateMatrixWorld(true);

        // Disable ugly tile skirts
        this.view.tileLayer.disableSkirt = true;

        // Add WMS layers
        for (const group of config.groups) {
            if (this.config.groups.hasOwnProperty(group)) {
                const parts = config.groups[group];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'WMSLayer' && parts[i].include) {
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
                        }).then(this.refresh);
                    }
                }
            }
        }

        // The Raycaster is used to find which part of the model was clicked on, then create a popup box
        this.raycaster = new THREE.Raycaster();
        this.viewerDiv.addEventListener( 'dblclick',   function(event: any) {

                event.preventDefault();

                const modelViewObj = this.modelViewObj;

                modelViewObj.mouse.x = (event.offsetX / this.clientWidth) * 2 - 1;
                modelViewObj.mouse.y = -(event.offsetY / this.clientHeight) * 2 + 1;

                modelViewObj.raycaster.setFromCamera(modelViewObj.mouse, modelViewObj.view.camera.camera3D);

                const intersects  = modelViewObj.raycaster.intersectObjects(modelViewObj.scene.children, true);

                // Look at all the intersecting objects to see that if any of them have information for popups
                if (intersects.length > 0) {
                    for (let n = 0; n < intersects.length; n++) {
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
                                                if (popup_key + '_0' === intersects[n].object.name) {
                                                    modelViewObj.make_popup(event, parts[i]['popups'][popup_key]);
                                                    return;
                                                }
                                            }
                                        }
                                    // FIXME: Update config file and this so that we only use 'popups' code above
                                    } else if (parts[i].hasOwnProperty('3dobject_label') &&
                                           parts[i].hasOwnProperty('popup_info') &&
                                           intersects[n].object.name === parts[i]['3dobject_label'] + '_0') {
                                        modelViewObj.make_popup(event, parts[i]['popup_info']);
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
                    }
                }
            });
        this.viewerDiv.modelViewObj = this;

        // Insert some arrows to give us some orientation information
        const x_dir = new THREE.Vector3( 1, 0, 0 );
        const y_dir = new THREE.Vector3( 0, 1, 0 );
        const z_dir = new THREE.Vector3( 0, 0, 1 );

        const origin = new THREE.Vector3( );
        origin.copy(this.extentObj.center().xyz());

        const length = 200000;
        const hex_x = 0xff0000;
        const hex_y = 0x00ff00;
        const hex_z = 0x0000ff;

        const arrowHelper_x = new THREE.ArrowHelper( x_dir, origin, length, hex_x );
        arrowHelper_x.name = 'arrowHelper_x';
        this.scene.add( arrowHelper_x );
        const arrowHelper_y = new THREE.ArrowHelper( y_dir, origin, length, hex_y );
        arrowHelper_y.name = 'arrowHelper_y';
        this.scene.add( arrowHelper_y );
        const arrowHelper_z = new THREE.ArrowHelper( z_dir, origin, length - 130000, hex_z );
        arrowHelper_z.name = 'arrowHelper_z';
        this.scene.add( arrowHelper_z );

        // 3 axis virtual globe controller
        const trackBallControls = new GeoModelControls(this.view.camera.camera3D, this.view, this.extentObj.center().xyz());
        this.scene.add(trackBallControls.getObject());

        console.log('scene = ', this.scene);
        this.view.notifyChange(true);
    }


    update_group_tickbox(groupName: string) {
        for (let ulIdx = 0; ulIdx < this.ulElem.childNodes.length; ulIdx++) {
            let liElem = this.ulElem.childNodes[ulIdx];
            if (liElem.style.listStyleType === 'circle') {
                if (groupName === null || groupName === liElem.childNodes[0].nodeValue) {
                    const gName = liElem.childNodes[0].nodeValue;
                    const chBox = liElem.childNodes[1];
                    ulIdx++;
                    let checked = true;
                    liElem = this.ulElem.childNodes[ulIdx];
                    while (ulIdx < this.ulElem.childNodes.length && liElem.style.listStyleType === 'square') {
                        if (!liElem.childNodes[1].checked) {
                            checked = false;
                        }
                        ulIdx++;
                        liElem = this.ulElem.childNodes[ulIdx];
                    }
                    if (!checked) {
                        chBox.checked = false;
                        chBox.removeAttribute('checked');
                    } else {
                        chBox.checked = true;
                        chBox.setAttribute('checked', true);
                    }
                }
            }
        }
    }

    // FIXME: Style popup the same as the rest of the website
    // FIXME: Do the CSS the Angular way
    make_popup(event, popupInfo) {
        const popupDiv = document.getElementById('popupBoxDiv');
        popupDiv.style.top = event.clientY;
        popupDiv.style.left = event.clientX;
        popupDiv.style.display = 'inline';
        while (popupDiv.firstChild) {
            popupDiv.removeChild(popupDiv.firstChild);
        }
        // Make 'X' for exit button in corner of popup window
        const exitDiv = document.createElement('div');
        exitDiv.id = 'popupExitDiv';
        exitDiv.innerHTML = 'X';
        exitDiv.onclick = function() { document.getElementById('popupBoxDiv').style.display = 'none'; };
        popupDiv.appendChild(exitDiv);
        // Make popup title
        const hText = document.createTextNode(popupInfo['title']);
        // hText.style.setProperty('font-weight', 'bold');
        // hText.style.setProperty('color', 'rgb(255, 255, 255);');
        popupDiv.appendChild(hText);
        // Add in popup information
        for (const key in popupInfo) {
             if (key !== 'href' && key !== 'title') {
                const liElem = document.createElement('li');
                liElem.style.setProperty('color', 'rgb(150, 150, 150)');
                liElem.style.setProperty('list-style-type', 'square');
                liElem.style.setProperty('margin-left', '6px;');
                const oText = document.createTextNode(key + ': ' + popupInfo[key]);
                liElem.appendChild(oText);
                popupDiv.appendChild(liElem);
            // Make URLs
            } else if (key === 'href') {
                for (let hIdx = 0; hIdx < popupInfo['href'].length; hIdx++) {
                    const liElem = document.createElement('li');
                    liElem.style.setProperty('color', 'rgb(150, 150, 150)');
                    liElem.style.setProperty('list-style-type', 'square');
                    liElem.style.setProperty('margin-left', '6px;');
                    const oLink = document.createElement('a');
                    oLink.href = popupInfo['href'][hIdx]['URL'];
                    oLink.style.setProperty('color', 'rgb(190, 190, 190);');
                    oLink.innerHTML = popupInfo['href'][hIdx]['label'];
                    oLink.target = '_blank';
                    liElem.appendChild(oLink);
                    popupDiv.appendChild(liElem);
                }
            }
        }
    }



    render() {
        this.renderer.render(this.scene, this.view.camera.camera3D);
    }

    refresh() {
        this.view.notifyChange(true);
    }

}
