import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LayoutComponent } from './layout.component';

const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: '',
                loadChildren: () => import('./providerselection/providerselection.module').then(m => m.ProviderSelectionModule)
            },
            {
                path: 'provider',
                loadChildren: () => import('./modelselection/modelselection.module').then(m => m.ModelSelectionModule)
            },
            {
                path: 'model',
                loadChildren: () => import('./modelview/modelview.module').then(m => m.ModelViewModule)
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class LayoutRoutingModule {}
