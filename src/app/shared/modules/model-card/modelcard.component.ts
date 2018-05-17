import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-model-card',
    templateUrl: './modelcard.component.html',
    styleUrls: ['./modelcard.component.scss']
})
export class ModelCardComponent {
    @Input() bgClass: string;
    @Input() icon: string;
    @Input() label: string;
    @Input() modelPath: string;
    @Input() prePath = '/geomodels';

    constructor() {}

    public navigateToModel() {
        window.location.assign(this.prePath + '/model/' + this.modelPath);
    }
}
