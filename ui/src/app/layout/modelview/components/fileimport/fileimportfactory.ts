import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { ModelInfoService } from '../../../../shared/services/model-info.service';
import { SidebarService } from '../../services/sidebar.service';
import { FileImport } from './fileimport';
import * as ITOWNS from 'itowns/dist/itowns';

@Injectable()
export class FileImportFactory {
    /**
     * constructor takes parameters taken from ModelView component
     * @param sidebarService sidebar service
     * @param modelInfoService model info service
     * @param httpService http service
     */
    constructor(private sidebarService: SidebarService, private modelInfoService: ModelInfoService,
                private httpService: HttpClient) {
    }

    /**
     * Creates a 'FileImport' object
     * @param scene ThreeJS scene object
     * @param gltfLoader GLTFLoader object
     * @param modelURLPath name of model
     * @param sceneArr array of SceneObj
     * @param viewController scene's ThreeDVirtSphereCtrls object
     */
    createFileImport(scene: ITOWNS.THREE.Scene, gltfLoader, modelUrlPath: string, sceneArr, viewController) {
        return new FileImport(scene, gltfLoader, modelUrlPath, sceneArr, viewController,
          this.sidebarService, this.modelInfoService, this.httpService);
    }

}
