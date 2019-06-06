import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';

import { ModelInfoService } from '../../../../shared/services/model-info.service';
import { SidebarService, MenuChangeType, MenuStateChangeType } from '../../../../shared/services/sidebar.service';
import { SceneObject, addSceneObj } from '../../scene-object';


import * as ITOWNS from '../../../../../../node_modules/itowns/dist/itowns';

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

    /**
     * constructor takes parameters taken from ModelView component
     * @param scene ThreeJS scene object
     * @param gltfLoader GLTFLoader object
     * @param modelURLPath name of model
     * @param sceneArr array of SceneObj
     * @param sidebarService sidebar service
     * @param modelInfoService model info service
     * @param httpService http service
     */
    constructor(scene: ITOWNS.THREE.Scene, gltfLoader, modelUrlPath: string, sceneArr,
      private sidebarService: SidebarService, private modelInfoService: ModelInfoService,
                  private httpService: HttpClient)  {
        this.gltfLoader = gltfLoader;
        this.modelUrlPath = modelUrlPath;
        this.scene = scene;
        this.sceneArr = sceneArr;
    }


    /**
     *  Converts a string to glTF
     * @param fileStr string to be converted to GLTF
     **/
    private convertToGLTF(fileStr: string | ArrayBuffer): Promise<any> {
        const local = this;
        const URL =  './api/' + this.modelUrlPath + '?' + local.modelInfoService.buildURL({'service': 'CONVERT'});
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
    private readAndConvert(data): any {
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
                        const objectId = 'drag_and_drop' + local.fileCount.toString();
                        local.fileCount++;
                        gObject.scene.name = objectId + '_0';
                        // Add object to scene
                        local.scene.add(gObject.scene);
                        addSceneObj(local.sceneArr, { 'display_name': objectId, 'displayed': true,
                                                      'model_url': objectId,
                                                  'type': 'GLTFObject' }, new SceneObject(gObject.scene),
                                                  'Imports');
                        const menuChange: MenuChangeType = { group: 'Imports', subGroup: objectId,
                                                             state: MenuStateChangeType.NEW_PART };
                        local.sidebarService.changeMenuState(menuChange);
                    }
                },
                function(err) {
                    console.error('An error occurred parsing the GLTF file: ', err);
                }
            );
        } catch ( e ) {
          // For SyntaxError or TypeError, return a generic failure message.
          console.error('Error while parsing GLTF: ', e);
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
                        reader.onload = function (evt) {
                            local.convertToGLTF(reader.result).then(
                                function(data) {
                                    local.readAndConvert(data);
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


}
