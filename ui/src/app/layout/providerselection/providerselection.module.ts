import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

import { ProviderSelectionRoutingModule } from './providerselection-routing.module';
import { ProviderSelectionComponent } from './providerselection.component';
import { ProviderCardModule } from '../../shared';

@NgModule({
    imports: [
        CommonModule,
        NgbCarouselModule,
        NgbAlertModule,
        ProviderSelectionRoutingModule,
        ProviderCardModule,
        ProviderSelectionComponent
    ]
})
export class ProviderSelectionModule {}
