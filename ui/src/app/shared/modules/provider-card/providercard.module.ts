import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProviderCardComponent } from './providercard.component';

@NgModule({
    imports: [CommonModule],
    declarations: [ProviderCardComponent],
    exports: [ProviderCardComponent]
})
export class ProviderCardModule {}
