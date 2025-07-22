import { Component, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';

/**
 * Used to create a set of card on the screen which user can click on to select
 * a particular provider
 */
@Component({
    selector: 'app-provider-card',
    templateUrl: './providercard.component.html',
    styleUrls: ['./providercard.component.scss'],
    standalone: false
})
export class ProviderCardComponent {
    @Input() bgClass: string;
    @Input() icon: string;
    @Input() count: number;
    @Input() label: string;
    @Input() data: number;
    @Input() providerPath: string;
    @Input() prePath = '';
    @Input() infoLink = '';

    constructor() {
        // If this website sits in a subdirectory of web server's 'document root' directory
        if (environment.usePrePath) {
            this.prePath = environment.prePath;
        }
    }

    /**
     * Navigates the browser to a new page of models associated with a certain provider,
     * but only if there are more than zero models
     * @param modelCount number of models belonging to that provider
     */
    public navigateToProvider(modelCount: number) {
        if (modelCount > 0) {
            window.location.assign(this.prePath + '/provider/' + this.providerPath);
        }
    }

    /**
     * Open up a window to more information about the provider
     */
    public openInfoLink() {
        window.open(this.infoLink);
    }
}
