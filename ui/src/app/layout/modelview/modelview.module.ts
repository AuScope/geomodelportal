import { NgModule } from '@angular/core';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { MatSliderModule} from '@angular/material/slider';

import { ModelViewRoutingModule } from './modelview-routing.module';
import { ModelViewComponent } from './modelview.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TimelineComponent, NotificationComponent } from './components';
import { ModelCardModule } from '../../shared';
import { HelpComponent } from './components/help/help.component';


@NgModule({
    imports: [
        CommonModule,
        NgbCarouselModule.forRoot(),
        NgbAlertModule.forRoot(),
        ModelViewRoutingModule,
        ModelCardModule,
        MatSliderModule,
        NgbModule.forRoot()
    ],
    declarations: [
        ModelViewComponent,
        TimelineComponent,
        NotificationComponent,
        SidebarComponent,
        HelpComponent
    ]
})
export class ModelViewModule {}
