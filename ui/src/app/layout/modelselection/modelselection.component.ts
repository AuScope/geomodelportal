import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { routerTransition } from '../../router.animations';



import { ModelInfoService } from '../../shared/services/model-info.service';

@Component({
    selector: 'app-modelselection',
    templateUrl: './modelselection.component.html',
    animations: [routerTransition()]
})
export class ModelSelectionComponent implements OnInit {

    // Geological models for each provider
    public providerModels: any = {};

    public providerPath = '';

    constructor(private route: ActivatedRoute,
                private modelInfoService: ModelInfoService) {
    }

    ngOnInit() {
        this.providerPath = this.route.snapshot.paramMap.get('providerPath');
        this.modelInfoService.getProviderModelInfo().then(res => { this.providerModels = res; });
    }

}
