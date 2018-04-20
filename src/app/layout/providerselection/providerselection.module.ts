import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

import { ProviderSelectionRoutingModule } from './providerselection-routing.module';
import { ProviderSelectionComponent } from './providerselection.component';
import {
    TimelineComponent,
    NotificationComponent
} from './components';
import { ProviderCardModule } from '../../shared';

@NgModule({
    imports: [
        CommonModule,
        NgbCarouselModule.forRoot(),
        NgbAlertModule.forRoot(),
        ProviderSelectionRoutingModule,
        ProviderCardModule
    ],
    declarations: [
        ProviderSelectionComponent,
        TimelineComponent,
        NotificationComponent
    ]
})
export class ProviderSelectionModule {}
