import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

import { ModelViewRoutingModule } from './modelview-routing.module';
import { ModelViewComponent } from './modelview.component';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import {
    TimelineComponent,
    NotificationComponent
} from './components';
import { ModelCardModule } from '../../shared';

@NgModule({
    imports: [
        CommonModule,
        NgbCarouselModule.forRoot(),
        NgbAlertModule.forRoot(),
        ModelViewRoutingModule,
        ModelCardModule
    ],
    declarations: [
        ModelViewComponent,
        TimelineComponent,
        NotificationComponent,
        SidebarComponent
    ]
})
export class ModelViewModule {}
