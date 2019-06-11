import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';

import { ModelInfoService } from '../../../../shared/services/model-info.service';
import { SidebarService, MenuChangeType, MenuStateChangeType } from '../../services/sidebar.service';
import { SceneObject, addSceneObj } from '../../scene-object';


import * as ITOWNS from '../../../../../../node_modules/itowns/dist/itowns';

// Group name in sidebar for imported filtes
const IMPORT_GROUP_NAME = 'Imported Files';

// This class is responsible for loading a file into the ModelView THreeJS scene
export class FileImport {

    // GLTFLoader object
    private gltfLoader;

    // Promise used to wrap loading of GLTF file into scene
    private gltfPromise;

    // Current model's name as part if its URL
    private modelUrlPath;

    // ModelView 'sTHREE scene ovject
    private scene;

    // Array of SceneObj
    private sceneArr;

    // Count of number of files imported
    private fileCount = 0;

    // Scene's view controller i.e. ThreeDVirtSphereCtrls
    private viewController;

    /**
     * constructor takes parameters taken from ModelView component
     * @param scene ThreeJS scene object
     * @param gltfLoader GLTFLoader object
     * @param modelURLPath name of model
     * @param sceneArr array of SceneObj
     * @param viewController scene's ThreeDVirtSphereCtrls object
     * @param sidebarService sidebar service
     * @param modelInfoService model info service
     * @param httpService http service
     */
    constructor(scene: ITOWNS.THREE.Scene, gltfLoader, modelUrlPath: string, sceneArr, viewController,
      private sidebarService: SidebarService, private modelInfoService: ModelInfoService,
                  private httpService: HttpClient)  {
        this.gltfLoader = gltfLoader;
        this.modelUrlPath = modelUrlPath;
        this.scene = scene;
        this.sceneArr = sceneArr;
        this.viewController = viewController;
    }


    /**
     *  Converts a string to glTF
     * @param fileStr string to be converted to GLTF
     **/
    private convertToGLTF(fileStr: string | ArrayBuffer): Promise<any> {
        const local = this;
        const URL =  './api/' + this.modelUrlPath + '?' + local.modelInfoService.buildURL({'service': 'CONVERT',
                                                                                            'id': this.generateId(16)});
        this.gltfPromise = new Promise(function(resolve, reject) {
            local.httpService.post(URL, fileStr).subscribe(
                data => {
                    const dataResult = data as string [];
                    resolve(dataResult);
                },
                (err: HttpErrorResponse) => {
                    console.error('Cannot convert to GLTF:', err);
                    reject(err);
                }
            );
        });
        return this.gltfPromise;
    }

    /**
     * Reads and parses file
     * @param data file's data
     */
    private readAndConvert(data, fileName: string): any {
        const local = this;
        try {
            // Convert to string
            const dataStr = JSON.stringify(data);
            // Convert to byte array
            const arr = [];
            for (let k = 0; k < dataStr.length; k++) {
                arr.push(dataStr.charCodeAt(k));
            }
            const uint = new Uint8Array(arr);
            local.gltfLoader.parse(uint, './api/',
                function(gObject) {
                    if (gObject) {
                        const fileNameId = local.fileCount.toString() + '_' + fileName.substring(0, 24);
                        local.fileCount++;
                        gObject.scene.name = fileNameId;
                        // Add object to scene
                        local.scene.add(gObject.scene);
                        addSceneObj(local.sceneArr, { 'display_name': fileNameId, 'displayed': true,
                                                      'model_url': fileNameId, 'type': 'GLTFObject' },
                                  new SceneObject(gObject.scene), IMPORT_GROUP_NAME);
                        local.viewController.updateView();

                        // Add new entry to sidebar
                        let menuChange: MenuChangeType = { group: IMPORT_GROUP_NAME, subGroup: fileNameId,
                                                             state: MenuStateChangeType.NEW_PART };
                        local.sidebarService.changeMenuState(menuChange);

                        // Open new entry in sidebar
                        menuChange = { group: IMPORT_GROUP_NAME, subGroup: fileNameId, state: MenuStateChangeType.OPENED };
                        local.sidebarService.changeMenuState(menuChange);

                        // Make everything invisible except this model part
                        menuChange = { group: IMPORT_GROUP_NAME, subGroup: fileNameId, state: MenuStateChangeType.ALL_BAR_ONE };
                        local.sidebarService.changeMenuState(menuChange);

                        // Move to view new object in scene
                        const sceneObj = local.sceneArr[IMPORT_GROUP_NAME][fileNameId].sceneObj;
                        if (local.viewController.moveViewToObj(sceneObj)) {
                            const newPos = local.viewController.getCameraPosition();
                            local.modelInfoService.newCameraPos([newPos.x, newPos.y, newPos.z, newPos.order]);
                        }
                    }
                },
                function(err) {
                    console.error('An error occurred parsing the GLTF file: ', err);
                }
            );
        } catch (err) {
          // For SyntaxError or TypeError, return a generic failure message.
          console.error('Error while parsing GLTF: ', err);
        }
        return ['', ''];
    }


    /**
     * Fetches file from browser and starts the conversion to GLTF process
     * @param ev event object
     */
    public doTryConvert(ev) {
        const local = this;
        if (ev.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            for (let i = 0; i < ev.dataTransfer.items.length; i++) {
                // If dropped items aren't files, reject them
                if (ev.dataTransfer.items[i].kind === 'file') {
                    const file = ev.dataTransfer.items[i].getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function (_evt) {
                            local.convertToGLTF(reader.result).then(
                                function(data) {
                                    local.readAndConvert(data, file.name);
                                },
                                function(err) {
                                    console.error('An error occurred converting the GLTF file: ', err);
                                }
                            );
                        };
                        reader.onerror = function (evt) {
                            console.error('An error ocurred reading the file', evt);
                        };
                        reader.readAsText(file, 'UTF-8');
                    }
                }
            }
        } else {
            // Use DataTransfer interface to access the file(s)
            for (let i = 0; i < ev.dataTransfer.files.length; i++) {
                console.log('ev.dataTransfer.files[' + i + '].name = ' + ev.dataTransfer.files[i].name);
            }
       }
    }


    /**
     * Converts a single byte to a hex string
     * @param byte a uint8 byte
     * @returns hex string
     */
    private byteToHex(byte: number): string {
        return ('0' + byte.toString(16)).slice(-2);
    }


    /**
     * Generates a random hex string
     * @param len length of hex string, must be an even number
     * @returns hex string
     */
    private generateId(len: number) {
        const arr = new Uint8Array(len / 2);
        window.crypto.getRandomValues(arr);
        return Array.from(arr, this.byteToHex).join('');
    }

}
