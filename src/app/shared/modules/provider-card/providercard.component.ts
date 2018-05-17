import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-provider-card',
    templateUrl: './providercard.component.html',
    styleUrls: ['./providercard.component.scss']
})
export class ProviderCardComponent {
    @Input() bgClass: string;
    @Input() icon: string;
    @Input() count: number;
    @Input() label: string;
    @Input() data: number;
    @Input() providerPath: string;
    @Input() prePath = '/geomodels';

    constructor() {}

    public navigateToProvider() {
        window.location.assign(this.prePath + '/provider/' + this.providerPath);
    }
}
