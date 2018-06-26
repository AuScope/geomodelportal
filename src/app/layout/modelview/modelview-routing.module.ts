import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ModelViewComponent } from './modelview.component';

const routes: Routes = [
    {
        path: ':modelPath', component: ModelViewComponent
    },
    // If no model selected, then go back to home page
    {
        path: '', redirectTo: '/', pathMatch: 'full'
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ModelViewRoutingModule {
}
