import { Component } from '@angular/core';
import { routerTransition } from '../../router.animations';
import { ModelInfoService } from '../../shared/services/model-info.service';

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
        this.sliders.push(
            {
                imagePath: 'assets/images/Windimurra.PNG',
                label: 'Western Australia (DMIRS)',
                text: 'Windimurra Model'
            },
            {
                imagePath: 'assets/images/NorthGawler.PNG',
                label: 'South Australia (Minerals)',
                text: 'North Gawler Model'
            },
            {
                imagePath: 'assets/images/RoseberyLyell.PNG',
                label: 'Tasmania (MRT)',
                text: 'Rosebery Lyell Model'
            },
            {
                imagePath: 'assets/images/Yilgarn.PNG',
                label: 'Geoscience Australia',
                text: 'Yilgarn Model'
            },
            {
              imagePath: 'assets/images/Otway.PNG',
              label: 'Victoria (Earth Resources)',
              text: 'Otway Model'
            }
        );
        this.modelInfoService.getProviderInfo().then(res => { this.sources = res; });
    }

}
