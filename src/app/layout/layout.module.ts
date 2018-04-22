import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { LayoutRoutingModule } from './layout-routing.module';
import { LayoutComponent } from './layout.component';
import { HeaderComponent } from './components/header/header.component';
import {MatSliderModule} from '@angular/material/slider';

@NgModule({
    imports: [
        CommonModule,
        LayoutRoutingModule,
        TranslateModule,
        MatSliderModule,
        NgbDropdownModule.forRoot()
    ],
    declarations: [LayoutComponent, HeaderComponent]
})
export class LayoutModule {}
