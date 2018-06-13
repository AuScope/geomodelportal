import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProviderSelectionComponent } from './providerselection.component';
import { environment } from '../../../environments/environment';



const routes: Routes = [{
    path: '', component: ProviderSelectionComponent
}];

/*let prePath = '';
if (environment.usePrePath) {
    prePath = 'geomodels';
}

routes.push({
    path: prePath, component: ProviderSelectionComponent
});
console.log('routes=', routes[0].path);*/

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ProviderSelectionRoutingModule {
}
