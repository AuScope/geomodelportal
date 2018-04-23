import { Component, OnInit } from '@angular/core';
import { routerTransition } from '../../router.animations';

@Component({
    selector: 'app-modelview',
    templateUrl: './modelview.component.html',
    styleUrls: ['./modelview.component.scss'],
    animations: [routerTransition()]
})
export class ModelViewComponent implements OnInit {

    constructor() {}

    ngOnInit() {}

}
