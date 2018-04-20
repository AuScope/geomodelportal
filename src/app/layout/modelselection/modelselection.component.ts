import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { routerTransition } from '../../router.animations';

import 'rxjs/add/operator/switchMap';

@Component({
    selector: 'app-modelselection',
    templateUrl: './modelselection.component.html',
    styleUrls: ['./modelselection.component.scss'],
    animations: [routerTransition()]
})
export class ModelSelectionComponent implements OnInit {

    // Sources of geological models
    public providerModels: any = {};

    // List of model information
    public models: any = {};

    // Name of current provider
    public providerName = '';

    constructor(private route: ActivatedRoute,
                private router: Router) {

        // At the moment this information is all hard-coded; this is temporary.
        // Eventually I would like this information to be retrieved from the server
        //
        this.providerModels =  {
            'vic': {
                name: 'Victoria',
                models: [
                    {
                        name: 'Otway Basin',
                        modelPath: 'otway',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    }
                ]
            },
            'wa': {
                name: 'Western Australia',
                models: [
                    {
                        name: 'Sandstone',
                        modelPath: 'sandstone',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    },
                    {
                        name: 'Rocklea Inliner',
                        modelPath: 'rocklea',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    }
                ]
            },
            'sa': {
                name: 'South Australia',
                models: [
                    {
                        name: 'North Gawler',
                        modelPath: 'ngawler',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    }
                ]
            },
            'tasmania': {
                name: 'Tasmania',
                models: [
                    {
                        name: 'Rosebery Lyell',
                        modelPath: 'rosebery',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    }
                ]
            },
            'qld': {
                name: 'Queensland',
                models: [
                    {
                        name: 'Mt Dore',
                        modelPath: 'mtdore',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    },
                    {
                        name: 'Quamby',
                        modelPath: 'quamby',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    }
                ]
            },
            'nsw': {
                name: 'N.S.W.',
                models: [
                    {
                        name: 'Southern New England',
                        modelPath: 'neweng',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    },
                    {
                        name: 'Western Tamworth',
                        modelPath: 'tamwor',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    }
                ]
            },
            'nt': {
                name: 'Northern Territory',
                models: [
                    {
                        name: 'Not yet',
                        modelPath: 'NA',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    }
                ]
            },
            'ga': {
                name: 'Geoscience Australia',
                models: [
                    {
                        name: 'Capel-Faust',
                        modelPath: 'capel',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    },
                    {
                        name: 'North-Queensland',
                        modelPath: 'norqld',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    },
                    {
                        name: 'Gunnedah-Surat',
                        modelPath: 'gunnedah',
                        icon: 'fa-map-signs',
                        colourClass: 'warning'
                    }
                ]
            }
        };
    }

    ngOnInit() {
        const providerPath = this.route.snapshot.paramMap.get('providerPath');
        let providerObj = { name: 'Unknown', models: [] };
        if (providerPath in this.providerModels) {
            providerObj = this.providerModels[providerPath];
        }
        console.log('providerPath=', providerPath);
        console.log('this.providerModels[providerPath]=', providerObj);
        this.providerName = providerObj.name;
        this.models = providerObj.models;
    }

}
