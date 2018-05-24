import { Component, Input } from '@angular/core';

/**
 * Component used to display a series of cards, representing models supplied by a certain provider
 */
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

    /**
     * Navigates the browser to a new page to view the chosen model
     */
    public navigateToModel() {
        window.location.assign(this.prePath + '/model/' + this.modelPath);
    }
}
