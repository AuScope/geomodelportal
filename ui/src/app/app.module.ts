import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ModelInfoService } from './shared/services/model-info.service';
import { SidebarService } from './shared/services/sidebar.service';
import { HelpinfoService } from './shared/services/helpinfo.service';
import {APP_BASE_HREF} from '@angular/common';
import { environment } from '../environments/environment';

// AoT requires an exported function for factories
export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: createTranslateLoader,
                deps: [HttpClient]
            }
        }),
        AppRoutingModule
    ],
    providers: [
        ModelInfoService,
        SidebarService,
        HelpinfoService,
        // Used when the website is installed in a subdirectory of web server's 'document root'
        // It lets the Angular router know that the base directory of website is a subdirectory of 'document root'
        {provide: APP_BASE_HREF, useFactory: () => {
            if (environment.usePrePath) {
                return environment.prePath;
            }
            return '';
        }}
    ],
    declarations: [AppComponent],
    bootstrap: [AppComponent]
})
export class AppModule {}
