import { Component, OnInit } from '@angular/core';
import { routerTransition } from '../../router.animations';
import { ModelInfoService } from '../../shared/services/model-info.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-providerselection',
    templateUrl: './providerselection.component.html',
    styleUrls: ['./providerselection.component.scss'],
    animations: [routerTransition()]
})
export class ProviderSelectionComponent implements OnInit {
    // Model showcase images
    public sliders: Array<any> = [];

    // Sources of geological models
    public sources: Array<any> = [];

    constructor(private modelInfoService: ModelInfoService) {
        // At the moment this information is all hard-coded; this is temporary.
        // Eventually I would like this information to be retrieved from the server
        //
        this.sliders.push(
            {
                imagePath: 'assets/images/Otway.PNG',
                label: 'Victoria',
                text: 'Otway Basin Model'
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
            }
        );


    }

    ngOnInit() {
        this.modelInfoService.getProviderInfo().subscribe(
            data => {
                this.sources = data as string [];
                console.log('!!! this.sources = ', this.sources);
            },
            (err: HttpErrorResponse) => {
                console.log('Cannot load JSON', err);
            }
        );

    }

}
