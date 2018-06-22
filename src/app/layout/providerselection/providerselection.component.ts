import { Component } from '@angular/core';
import { routerTransition } from '../../router.animations';
import { ModelInfoService } from '../../shared/services/model-info.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-providerselection',
    templateUrl: './providerselection.component.html',
    styleUrls: ['./providerselection.component.scss'],
    animations: [routerTransition()]
})
export class ProviderSelectionComponent {
    // Model showcase images
    public sliders: Array<any> = [];

    // Sources of geological models
    public sources: any;

    constructor(private modelInfoService: ModelInfoService) {
        // FIXME: At the moment this information is all hard-coded; this is temporary.
        // Eventually I would like this information to be retrieved from the server
        //
        this.sliders.push(
            {
                imagePath: 'assets/images/Windimurra.PNG',
                label: 'Western Australia',
                text: 'Windimurra Model'
            },
            {
                imagePath: 'assets/images/NorthGawler.PNG',
                label: 'South Australia',
                text: 'North Gawler Model'
            },
            {
                imagePath: 'assets/images/RoseberyLyell.PNG',
                label: 'Tasmania',
                text: 'Rosebery Lyell Model'
            },
            {
                imagePath: 'assets/images/Yilgarn.PNG',
                label: 'Geoscience Australia',
                text: 'Yilgarn Model'
            }
        );
        this.modelInfoService.getProviderInfo().then(res => { this.sources = res; });
    }

}
