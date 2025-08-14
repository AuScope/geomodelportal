import { enableProdMode, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { createTranslateLoader } from './app/app.module';
import { environment } from './environments/environment';
import { ModelInfoService } from './app/shared/services/model-info.service';
import { SidebarService } from './app/layout/modelview/services/sidebar.service';
import { HelpinfoService } from './app/layout/modelview/services/helpinfo.service';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi, HttpClient } from '@angular/common/http';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppRoutingModule } from './app/app-routing.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AppComponent } from './app/app.component';

// import 'hammerjs';

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(CommonModule, BrowserModule, TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: createTranslateLoader,
                deps: [HttpClient]
            }
        }), AppRoutingModule, NgbModule),
        ModelInfoService,
        SidebarService,
        HelpinfoService,
        // Used when the website is installed in a subdirectory of web server's 'document root'
        // It lets the Angular router know that the base directory of website is a subdirectory of 'document root'
        { provide: APP_BASE_HREF, useFactory: () => {
                if (environment.usePrePath) {
                    return environment.prePath;
                }
                return '';
            } },
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimations()
    ]
})
    .catch(err => console.log(err));
