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
                imagePath: 'assets/images/StuartShelf.PNG',
                text: 'National Computational Infrastructure (NCI) & G. Heinson (Uni. of Adelaide)',
                label: 'Stuart Shelf Model'
            },
            {
                imagePath: 'assets/images/SouthNewEngland.PNG',
                text: 'N.S.W. (Resources & Geoscience)',
                label: 'South New England Deep Crustal Model'
            },
            {
                imagePath: 'assets/images/CurnamonaSed.PNG',
                text: 'South Australia (Energy and Mining)',
                label: 'Curnamona Sedimentary Basins Model'
            },
            {
                imagePath: 'assets/images/Windimurra.PNG',
                text: 'Western Australia (DMIRS)',
                label: 'Windimurra Model'
            },
            {
                imagePath: 'assets/images/NorthGawler.PNG',
                text: 'South Australia (Energy and Mining)',
                label: 'North Gawler Model'
            },
            {
                imagePath: 'assets/images/RoseberyLyell.PNG',
                text: 'Tasmania (MRT)',
                label: 'Rosebery Lyell Model'
            },
            {
                imagePath: 'assets/images/Yilgarn.PNG',
                text: 'Geoscience Australia',
                label: 'Yilgarn Model'
            },
            {
                imagePath: 'assets/images/Otway.PNG',
                text: 'Victoria (Earth Resources)',
                label: 'Otway Model'
            }
        );
        this.modelInfoService.getProviderInfo().then(res => { this.sources = res; });
    }

}
