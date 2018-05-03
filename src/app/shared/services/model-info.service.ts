import { Injectable } from '@angular/core';
import {HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { OnInit } from '@angular/core';

export interface ProviderInfo {
    name: string;
    numberModels: number;
    icon: string;
    colourClass: string;
    providerPath: string;
}

@Injectable()
export class ModelInfoService implements OnInit {
    private providerModelInfo;
    private providerInfoList: ProviderInfo[] = [];
    public initialised = false;

    constructor(private httpService: HttpClient) {
    }

    initialise() {
        const local = this;
        return new Promise(function(resolve, reject) {
            local.httpService.get('./assets/geomodels/ProviderModelInfo.json').subscribe(
                data => {
                    local.providerModelInfo = data as string [];
                    console.log('ProviderModelInfo Loaded', local.providerModelInfo);
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
                    console.log('Cannot load JSON', err);
                    reject(err);
                }
            );
        });
    }

    getModelInfo(modelKey: string) {
         return this.httpService.get('./assets/geomodels/NorthGawler.json');
    }

    async getProviderModelInfo() {
        const local = this;
        if (this.initialised) {
            return new Promise(resolve => resolve(local.providerModelInfo));
        }
        const result = await this.initialise();
        return new Promise(resolve => resolve(result[0]));
    }

    async getProviderInfo() {
        const local = this;
        if (this.initialised) {
            return new Promise(resolve => resolve(local.providerInfoList));
        }
        const result = await this.initialise();
        return new Promise(resolve => resolve(result[1]));
    }

    ngOnInit() {
        console.log('ModelInfoService ngOnInit()');
    }

}
