import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { ProviderSelectionModule } from './providerselection/providerselection.module';
import { environment } from '../../environments/environment';

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
                path: 'provider',
                loadChildren: './modelselection/modelselection.module#ModelSelectionModule'
            },
            {
                path: 'model',
                loadChildren: './modelview/modelview.module#ModelViewModule'
            }
        ]
    }
];

/*let prePath = '';
if (environment.usePrePath) {
    prePath = 'geomodels/';
}
routes[0].children.push({
        path: prePath + 'provider/:providerPath',
        loadChildren: './modelselection/modelselection.module#ModelSelectionModule'
});
routes[0].children.push({
        path: prePath + 'model/:modelPath',
        loadChildren: './modelview/modelview.module#ModelViewModule'
});
console.log('routes=', routes);*/

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class LayoutRoutingModule {}