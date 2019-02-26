import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProviderSelectionComponent } from './providerselection.component';

const routes: Routes = [{
    path: '', component: ProviderSelectionComponent
}];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ProviderSelectionRoutingModule {
}
