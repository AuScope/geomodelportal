import { Component, inject, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';

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
    @Input() providerPath = '';
    @Input() prePath = '';
    @Input() modelInfoLink = '';
    @Input() modelInfoMessage = '';

    router = inject(Router);

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
        this.router.navigate([this.prePath + '/model/' + this.modelPath], {
            state: { fromProvider: true, providerPath: this.providerPath }
        });
    }

    /** Open up a window to more information about the model
     */
    public openModelInfoLink() {
        window.open(this.modelInfoLink);
    }
}
