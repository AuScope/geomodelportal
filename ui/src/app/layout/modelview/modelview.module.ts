import { NgModule } from '@angular/core';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { MatSliderModule} from '@angular/material/slider';

import { ModelViewRoutingModule } from './modelview-routing.module';
import { ModelViewComponent } from './modelview.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ModelCardModule } from '../../shared';
import { HelpComponent } from './components/help/help.component';
import { OverviewComponent } from './components/overview/overview.component';
import { VolumecontrolsComponent } from './components/sidebar/components/volumecontrols/volumecontrols.component';


@NgModule({
    imports: [
        CommonModule,
        NgbCarouselModule,
        NgbAlertModule,
        ModelViewRoutingModule,
        ModelCardModule,
        MatSliderModule,
        NgbModule
    ],
    declarations: [
        ModelViewComponent,
        SidebarComponent,
        HelpComponent,
        OverviewComponent,
        VolumecontrolsComponent
    ]
})
export class ModelViewModule {}
