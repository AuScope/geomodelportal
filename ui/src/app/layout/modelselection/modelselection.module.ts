import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

import { ModelSelectionRoutingModule } from './modelselection-routing.module';
import { ModelSelectionComponent } from './modelselection.component';
import { ModelCardModule } from '../../shared';

@NgModule({
    imports: [
        CommonModule,
        NgbCarouselModule,
        NgbAlertModule,
        ModelSelectionRoutingModule,
        ModelCardModule
    ],
    declarations: [
        ModelSelectionComponent
    ]
})
export class ModelSelectionModule {}
