import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { ProviderSelectionModule } from './providerselection/providerselection.module';

const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: '',
                loadChildren: './providerselection/providerselection.module#ProviderSelectionModule'
            },
            {
                path: 'provider/:providerPath',
                loadChildren: './modelselection/modelselection.module#ModelSelectionModule'
            },
            {
                path: 'model/:modelPath',
                loadChildren: './modelview/modelview.module#ModelViewModule'
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class LayoutRoutingModule {}
