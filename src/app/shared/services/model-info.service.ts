import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';

export interface ProviderInfo {
    name: string;
    numberModels: number;
    icon: string;
    colourClass: string;
    providerPath: string;
}

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

// Callback function used to get information about a state change
export type ModelPartCallbackType =  (groupName: string, modelUrl: string, state: ModelPartStateChange) => any;

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

    constructor(private httpService: HttpClient) {
    }

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

    // Initialise state of model
    private parse_model(modelInfo) {
        for (const groupName in modelInfo.groups) {
            if (modelInfo.groups.hasOwnProperty(groupName)) {
                this.modelPartState[groupName] = {};
                for (const partObj of modelInfo.groups[groupName]) {
                    if (partObj.include) {
                        this.modelPartState[groupName][partObj.model_url] = { displayed: partObj.displayed,
                                              transparency: 1.0, heightOffset: 0.0, oldTransparency: 1.0 };
                    }
                }
            }
        }
    }

    public getModelInfo(modelKey: string) {
        const local = this;
        if (this.modelCache.hasOwnProperty(modelKey)) {
            return new Promise(resolve => resolve(this.modelCache[modelKey]));
        }
        return new Promise(function(resolve, reject) {
            local.httpService.get('./assets/geomodels/NorthGawler.json').subscribe(
                data => {
                    const modelInfo = data as string [];
                    local.modelCache[modelKey] = data;
                    local.parse_model(data);
                    resolve(data);
                },
                (err: HttpErrorResponse) => {
                    console.log('Cannot load model JSON file', err);
                    reject(err);
                }
            );
        });
    }

    public async getProviderModelInfo() {
        const local = this;
        if (this.initialised) {
            return new Promise(resolve => resolve(local.providerModelInfo));
        }
        const result = await this.initialise();
        return new Promise(resolve => resolve(result[0]));
    }

    public async getProviderInfo() {
        const local = this;
        if (this.initialised) {
            return new Promise(resolve => resolve(local.providerInfoList));
        }
        const result = await this.initialise();
        return new Promise(resolve => resolve(result[1]));
    }

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

    //
    public setModelPartState(groupName: string, partId: string, state: ModelPartStateType) {
        this.modelPartState[groupName][partId] = state;
    }

    // Called from the sidebar when tickbox is toggled
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

    public getModelPartState(groupName: string, partId: string) {
        return this.modelPartState[groupName][partId];
    }

    public getModelPartStateObj() {
        return this.modelPartState;
    }

    // Registers a model part callback, registered by the viewer so it knows what to do
    public registerModelPartCallback(callback: ModelPartCallbackType) {
        this.modelPartCallback = callback;
    }
}
