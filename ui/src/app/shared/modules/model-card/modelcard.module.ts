import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelCardComponent } from './modelcard.component';

@NgModule({
    imports: [CommonModule, ModelCardComponent],
    exports: [ModelCardComponent]
})
export class ModelCardModule {}
