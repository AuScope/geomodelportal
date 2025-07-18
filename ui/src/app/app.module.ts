import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ModelInfoService } from './shared/services/model-info.service';
import { SidebarService } from './layout/modelview/services/sidebar.service';
import { HelpinfoService } from './layout/modelview/services/helpinfo.service';
import {APP_BASE_HREF} from '@angular/common';
import { environment } from '../environments/environment';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

// AoT requires an exported function for factories
export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({ declarations: [AppComponent],
    bootstrap: [AppComponent], imports: [CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: createTranslateLoader,
                deps: [HttpClient]
            }
        }),
        AppRoutingModule,
        NgbModule], providers: [
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
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule {}
