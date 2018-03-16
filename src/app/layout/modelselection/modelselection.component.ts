import { Component, OnInit } from '@angular/core';
import { routerTransition } from '../../router.animations';

@Component({
    selector: 'app-modelselection',
    templateUrl: './modelselection.component.html',
    styleUrls: ['./modelselection.component.scss'],
    animations: [routerTransition()]
})
export class ModelSelectionComponent implements OnInit {
    // Model showcase images
    public sliders: Array<any> = [];

    // Sources of geological models
    public sources: Array<any> = [];

    constructor() {
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

        this.sources =  [
            {
                name: 'Victoria',
                numberModels: 4,
                icon: 'fa-leaf',
                colourClass: 'primary'
            },
            {
                name: 'Western Australia',
                numberModels: 17,
                icon: 'fa-map-signs',
                colourClass: 'warning'
            },
            {
                name: 'South Australia',
                numberModels: 13,
                icon: 'fa-bookmark',
                colourClass: 'success'
            },
            {
                name: 'Tasmania',
                numberModels: 5,
                icon: 'fa-tree',
                colourClass: 'secondary'
            },
            {
                name: 'Queensland',
                numberModels: 10,
                icon: 'fa-sun-o',
                colourClass: 'danger'
            },
            {
                name: 'N.S.W.',
                numberModels: 8,
                icon: 'fa-institution',
                colourClass: 'info'
            },
            {
                name: 'Northern Territory',
                numberModels: 9,
                icon: 'fa-anchor',
                colourClass: 'dark'
            },
            {
                name: 'Geoscience Australia',
                numberModels: 20,
                icon: 'fa-flag',
                colourClass: 'primary'
            }
        ];
    }

    ngOnInit() {}

}
