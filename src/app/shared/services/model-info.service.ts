import { Injectable } from '@angular/core';
import {HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { OnInit } from '@angular/core';


@Injectable()
export class ModelInfoService implements OnInit {

    private modelInfo: any = {
        'otway': { name: 'Otway Basin' },
        'sandstone': { name: 'Sandstone' },
        'rocklea': { name: 'Rocklea Inlier' }
    };


    constructor(private httpService: HttpClient) {
        console.log('ModelInfoService()');
        this.httpService.get('./assets/geomodels/NorthGawler.json').subscribe(
            data => {
                const modelJson = data as string [];
                console.log('ModelJson Loaded', modelJson);
            },
            (err: HttpErrorResponse) => {
                console.log('Cannot load JSON', err);
            }
        );
    }

    getModelInfo(path: string) {
         return this.httpService.get('./assets/geomodels/NorthGawler.json');


         /* getModelInfo().subscribe(
             data => {
                 const modelJson = data as string [];
                 console.log('ModelJson Loaded', modelJson);
             },
             (err: HttpErrorResponse) => {
                 console.log('Cannot load JSON', err);
             }
         );*/
    }

    getProviderModelInfo() {
        return this.httpService.get('./assets/geomodels/ProviderModelInfo.json');

        /* getProviderModelInfo().get('./assets/geomodels/ProviderModelInfo.json').subscribe(
            data => {
                const providerModelInfo = data as string [];
                console.log('ProviderModelInfo Loaded', this.providerModelInfo);
            },
            (err: HttpErrorResponse) => {
                console.log('Cannot load JSON', err);
            }
        ); */
    }

    getProviderInfo() {
        return this.httpService.get('./assets/geomodels/ProviderInfo.json');

        /* getProviderInfo().subscribe(
            data => {
                const providerInfo = data as string [];
                console.log('ProviderInfo Loaded', this.providerInfo);
            },
            (err: HttpErrorResponse) => {
                console.log('Cannot load JSON', err);
            }
        ); */
    }

    ngOnInit() {
        console.log('ngOnInit()!');
    }

}
