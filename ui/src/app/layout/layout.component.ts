import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
    imports: [HeaderComponent, RouterOutlet]
})
export class LayoutComponent implements OnInit {
    constructor() {}

    ngOnInit() {}
}
