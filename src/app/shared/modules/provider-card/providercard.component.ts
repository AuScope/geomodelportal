import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'app-provider-card',
    templateUrl: './providercard.component.html',
    styleUrls: ['./providercard.component.scss']
})
export class ProviderCardComponent implements OnInit {
    @Input() bgClass: string;
    @Input() icon: string;
    @Input() count: number;
    @Input() label: string;
    @Input() data: number;
    @Input() providerPath: string;
    @Input() prePath = '/geomodels';
    @Output() event: EventEmitter<any> = new EventEmitter();

    constructor() {}

    ngOnInit() {}
}
