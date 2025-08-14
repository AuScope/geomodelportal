import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PageHeaderComponent } from './page-header.component';

@NgModule({
    imports: [CommonModule, RouterModule, PageHeaderComponent],
    exports: [PageHeaderComponent]
})
export class PageHeaderModule {}
