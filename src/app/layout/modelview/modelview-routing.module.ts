import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ModelViewComponent } from './modelview.component';

const routes: Routes = [
    {
        path: '', component: ModelViewComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ModelViewRoutingModule {
}
