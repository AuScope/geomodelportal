import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ModelSelectionComponent } from './modelselection.component';

const routes: Routes = [
    {
        path: ':providerPath', component: ModelSelectionComponent
    },
    // If no provider selected, then go back to home page
    {
        path: '', redirectTo: '/', pathMatch: 'full'
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ModelSelectionRoutingModule {
}
