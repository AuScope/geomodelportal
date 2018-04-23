import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'app-model-card',
    templateUrl: './modelcard.component.html',
    styleUrls: ['./modelcard.component.scss']
})
export class ModelCardComponent implements OnInit {
    @Input() bgClass: string;
    @Input() icon: string;
    @Input() label: string;
    @Input() modelPath: string;
    @Output() event: EventEmitter<any> = new EventEmitter();

    constructor() {}

    ngOnInit() {}
}
