import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

import { ModelSelectionRoutingModule } from './modelselection-routing.module';
import { ModelSelectionComponent } from './modelselection.component';


@NgModule({
    imports: [
    CommonModule,
    NgbCarouselModule,
    NgbAlertModule,
    ModelSelectionRoutingModule,
    ModelSelectionComponent
]
})
export class ModelSelectionModule {}
