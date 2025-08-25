import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { routerTransition } from '../../router.animations';



import { ModelInfoService } from '../../shared/services/model-info.service';
import { ModelCardComponent } from '../../shared/modules/model-card/modelcard.component';

@Component({
    selector: 'app-modelselection',
    templateUrl: './modelselection.component.html',
    styleUrls: ['./modelselection.component.scss'],
    animations: [routerTransition()],
    imports: [ModelCardComponent]
})
export class ModelSelectionComponent implements OnInit {
    private route: ActivatedRoute;
    private modelInfoService: ModelInfoService;


    // Geological models for each provider
    public providerModels: any = {};

    public providerPath = '';

    constructor() {
        this.route = inject(ActivatedRoute);
        this.modelInfoService = inject(ModelInfoService);
    }

    ngOnInit() {
        this.providerPath = this.route.snapshot.paramMap.get('providerPath');
        this.modelInfoService.getProviderModelInfo().then(res => { this.providerModels = res; });
    }

}
