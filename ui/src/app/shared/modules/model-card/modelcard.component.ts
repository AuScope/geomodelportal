import { Component, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';

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
    @Input() prePath = '';
    @Input() modelInfoLink = '';

    constructor() {
        // If this website sits in a subdirectory of web server's 'document root' directory
        if (environment.usePrePath) {
            this.prePath = environment.prePath;
        }
    }

    /**
     * Navigates the browser to a new page to view the chosen model
     */
    public navigateToModel() {
        window.location.assign(this.prePath + '/model/' + this.modelPath);
    }

    /** Open up a window to more information about the model
     */
    public openModelInfoLink() {
        window.open(this.modelInfoLink);
    }
}
