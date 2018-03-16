import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ModelSelectionComponent } from './modelselection.component';

const routes: Routes = [
    {
        path: '', component: ModelSelectionComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ModelSelectionRoutingModule {
}
