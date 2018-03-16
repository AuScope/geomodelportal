import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

import { ModelSelectionRoutingModule } from './modelselection-routing.module';
import { ModelSelectionComponent } from './modelselection.component';
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
        ModelSelectionRoutingModule,
        StatModule
    ],
    declarations: [
        ModelSelectionComponent,
        TimelineComponent,
        NotificationComponent
    ]
})
export class ModelSelectionModule {}
