import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

import { ModelViewRoutingModule } from './modelview-routing.module';
import { ModelViewComponent } from './modelview.component';
import {
    TimelineComponent,
    NotificationComponent
} from './components';
import { StatModule } from '../../shared';

@NgModule({
    imports: [
        CommonModule,
        NgbCarouselModule.forRoot(),
        NgbAlertModule.forRoot(),
        ModelViewRoutingModule,
        StatModule
    ],
    declarations: [
        ModelViewComponent,
        TimelineComponent,
        NotificationComponent
    ]
})
export class ModelViewModule {}
