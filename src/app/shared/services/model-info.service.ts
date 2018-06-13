import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

export interface ProviderInfo {
    name: string;
    numberModels: number;
    icon: string;
    colourClass: string;
    providerPath: string;
}

export const FIXED_HEIGHT = -1.0;

// What has changed in the model part's state?
export enum  ModelPartStateChangeType { DISPLAYED, TRANSPARENCY, HEIGHT_OFFSET }

// Vessel for communicating change, note limitation: only one change at a time
export interface ModelPartStateChange {
    type: ModelPartStateChangeType;
    new_value: string | number;
}

export interface ModelPartStateType {
    displayed: boolean;
    transparency: number;
    heightOffset: number;
}

// Callback function used to get information about a state change in the model
export type ModelPartCallbackType =  (groupName: string, modelUrl: string, state: ModelPartStateChange) => any;

/**
 * Class used to share model state information between components (e.g. which parts are visible, transparency & displacement values)
 */
@Injectable()
export class ModelInfoService {
    private providerModelInfo = {};
    private providerInfoList: ProviderInfo[] = [];

    // Set to true once service has been initialised
    private initialised = false;

    // An attempt to make sure loaded files are cached so that files are not downloaded
    // multiple times
    private modelCache = {};

    // A callback used when some part of the model changes
    // Only one callback can be registered at a time
    private modelPartCallback: ModelPartCallbackType;

    // Stores the current state of the model parts
    private modelPartState = {};

    private modelViewResetSub = new Subject<any>();

    constructor(private httpService: HttpClient) {
    }

    /**
     * Initialise service
     */
    private initialise() {
        const local = this;
        return new Promise(function(resolve, reject) {
            local.httpService.get('./assets/geomodels/ProviderModelInfo.json').subscribe(
                data => {
                    local.providerModelInfo = data as string [];
                    for (const providerKey in local.providerModelInfo) {
                        if (local.providerModelInfo.hasOwnProperty(providerKey)) {
                            const providerInfo: ProviderInfo = { name: local.providerModelInfo[providerKey].name,
                                                                 numberModels: local.providerModelInfo[providerKey].models.length,
                                                                 icon: local.providerModelInfo[providerKey].icon,
                                                                 colourClass: local.providerModelInfo[providerKey].colourClass,
                                                                 providerPath: providerKey
                                                             };
                            local.providerInfoList.push(providerInfo);
                        }
                    }
                    local.initialised = true;
                    resolve([local.providerModelInfo, local.providerInfoList]);
                },
                (err: HttpErrorResponse) => {
                    console.log('Cannot load provider model JSON file', err);
                    reject(err);
                }
            );
        });
    }

    /**
     * Initialise state of model
     */
    private parse_model(modelInfo) {
        for (const groupName in modelInfo.groups) {
            if (modelInfo.groups.hasOwnProperty(groupName)) {
                this.modelPartState[groupName] = {};
                for (const partObj of modelInfo.groups[groupName]) {
                    // FIXME: Currently cannot change height of WMS layers
                    let heightOffset = 0.0;
                    if (partObj.type === 'WMSLayer') {
                        heightOffset = FIXED_HEIGHT;
                    }
                    if (partObj.include) {
                        this.modelPartState[groupName][partObj.model_url] = { displayed: partObj.displayed,
                                              transparency: 1.0, heightOffset: heightOffset, oldTransparency: 1.0 };
                    }
                }
            }
        }
    }

    /**
     * Retrieves all the model information by retrieving the model file from network
     * Model is intended to be stored in a model cache for future reference
     * @param modelKey key used as a handle to retrieve the model from the model cache
     * @return a promise of the model information in JSON format, and the directory name of the model files as an array[]
     */
    public async getModelInfo(modelKey: string): Promise<any> {
        const local = this;
        if (this.modelCache.hasOwnProperty(modelKey)) {
            return new Promise(resolve => resolve(this.modelCache[modelKey]));
        }
        if (!this.initialised) {
            const result = await this.initialise();
        }
        let model;
        for (const providerKey in local.providerModelInfo) {
            if (local.providerModelInfo.hasOwnProperty(providerKey)) {
                for (const modelInfo of local.providerModelInfo[providerKey]['models']) {
                    if (modelKey === modelInfo['modelUrlPath']) {
                        model = modelInfo;
                        break;
                    }
                }
                if (model !== undefined) {
                    break;
                }
            }
        }
        if (model !== undefined) {
            return new Promise(function(resolve, reject) {
                local.httpService.get('./assets/geomodels/' + model['configFile']).subscribe(
                    data => {
                        const modelInfo = data as string [];
                        local.modelCache[modelKey] = data;
                        local.parse_model(data);
                        resolve([data, model['modelDir']]);
                    },
                    (err: HttpErrorResponse) => {
                        console.log('Cannot load model JSON file', err);
                        reject(err);
                    }
                );
            });
        }
        return new Promise(function(resolve, reject) {
            console.log('Model not found in config file');
            reject('Model not found in config file');
        });
    }

    /**
     * Retrieves the provider model information from the model information
     * @return a promise of the provider model information in JSON format
     */
    public async getProviderModelInfo() {
        const local = this;
        if (this.initialised) {
            return new Promise(resolve => resolve(local.providerModelInfo));
        }
        const result = await this.initialise();
        return new Promise(resolve => resolve(result[0]));
    }

    /**
     * Retrieves the provider information from the model information
     * @return a promise of the provider information in JSON format
     */
    public async getProviderInfo() {
        const local = this;
        if (this.initialised) {
            return new Promise(resolve => resolve(local.providerInfoList));
        }
        const result = await this.initialise();
        return new Promise(resolve => resolve(result[1]));
    }

    /**
     * Reveals a part of the model by making all the other parts of the model transparent
     * @param groupName group name of the model part
     * @param partId part id of the model part
     * @param toggle if true will reveal the part, false will hide it
     */
    public revealPart(groupName: string, partId: string, toggle: boolean) {
        const TRANSPARENT = 0.05;
        for (const group in this.modelPartState) {
            if (this.modelPartState.hasOwnProperty(group)) {
                for (const part in this.modelPartState[group]) {
                    if (this.modelPartState[group].hasOwnProperty(part)) {
                        if (groupName !== group || partId !== part) {
                            if (toggle) {
                                this.modelPartState[group][part].oldTransparency =
                                                           this.modelPartState[group][part].transparency;
                                this.modelPartState[group][part].transparency = TRANSPARENT;
                                this.modelPartCallback(group, part, { type: ModelPartStateChangeType.TRANSPARENCY,
                                                                        new_value: TRANSPARENT });
                            } else {
                                this.modelPartState[group][part].transparency =
                                                           this.modelPartState[group][part].oldTransparency;
                                this.modelPartCallback(group, part, { type: ModelPartStateChangeType.TRANSPARENCY,
                                                                        new_value: this.modelPartState[group][part].transparency });
                            }
                        }
                    }
                }

            }
        }
    }

    /**
     * Sets the state of the model part
     * @param groupName group name of the model part
     * @param partId part id of the model part
     */
    public setModelPartState(groupName: string, partId: string, state: ModelPartStateType) {
        this.modelPartState[groupName][partId] = state;
    }

    /**
     * Indicate that something has changed
     * Called from the sidebar when tickbox is toggled
     * @param groupName name of group
     * @param partId model part identifier
     * @param stateChange object used to specify what has changed
     */
    public setModelPartStateChange(groupName: string, partId: string, stateChange: ModelPartStateChange) {
        // Update our records with the state change
        if (stateChange.type === ModelPartStateChangeType.DISPLAYED) {
            this.modelPartState[groupName][partId].displayed = stateChange.new_value;
        } else if (stateChange.type === ModelPartStateChangeType.TRANSPARENCY) {
            this.modelPartState[groupName][partId].transparency = stateChange.new_value;
        } else if (stateChange.type === ModelPartStateChangeType.HEIGHT_OFFSET) {
            this.modelPartState[groupName][partId].heightOffset = stateChange.new_value;
        }
        // Inform the listener with a callback
        this.modelPartCallback(groupName, partId, stateChange);
    }

    /**
     * Retrieves the state of a model part
     * @return state of a model part
     */
    public getModelPartState(groupName: string, partId: string): ModelPartStateType {
        return this.modelPartState[groupName][partId];
    }

    /**
     * Retrieves an object containing the states of all parts of the model
     * @return an object containing the states of all parts of the model
     */
    public getModelPartStateObj() {
        return this.modelPartState;
    }

    /**
     * Registers a model part callback, registered by the viewer so it knows what to do
     * @return callback function
     */
    public registerModelPartCallback(callback: ModelPartCallbackType) {
        this.modelPartCallback = callback;
    }

    /**
     * Resets the view of the model back to the starting point
     */
    public resetModelView() {
        this.modelViewResetSub.next();
    }

    /**
     * Call this to get informed when user tries to reset model view
     * @return an observable of the model reset view
     */
    public waitForModelViewReset(): Observable<any> {
        return this.modelViewResetSub.asObservable();
    }
}
