import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';

/**
 * Header component
 */
@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    standalone: false
})
export class HeaderComponent implements OnInit {
    pushRightClass = 'push-right';

    // Used to go back to main page via "Home" icon
    homePath = '/';
    provider = "";

    constructor(private translate: TranslateService, public router: Router) {

        this.translate.addLangs(['en', 'fr', 'ur', 'es', 'it', 'fa', 'de', 'zh-CHS']);
        this.translate.setDefaultLang('en');
        const browserLang = this.translate.getBrowserLang();
        if (browserLang) {
          this.translate.use(browserLang.match(/en|fr|ur|es|it|fa|de|zh-CHS/) ? browserLang : 'en');
        }
        this.router.events.subscribe(val => {
            if (
                val instanceof NavigationEnd &&
                window.innerWidth <= 992 &&
                this.isToggled()
            ) {
                this.toggleSidebar();
            }
        });

        // If website installed in a subdirectory of web server's 'document root', include the subdir in home path
        if (environment.usePrePath) {
            this.homePath = environment.prePath;
        }
    }

    ngOnInit() {
        this.detectProvider();
    }

    /**
     * Returns true if header is displayed
     * @returns true if header is displayed
     */
    isToggled(): boolean {
        const dom: HTMLBodyElement | null = document.querySelector('body');
        return dom ? dom.classList.contains(this.pushRightClass) : false;
    }

    /**
     * Toggles display of sidebar
     */
    toggleSidebar() {
        const dom: any = document.querySelector('body');
        dom.classList.toggle(this.pushRightClass);
    }

    /**
     * Toggles layout from right-to-left <-> left-to-right
     */
    rltAndLtr() {
        const dom: any = document.querySelector('body');
        dom.classList.toggle('rtl');
    }

    /**
     * Changes language
     */
    changeLang(language: string) {
        this.translate.use(language);
    }

    /**
     * Detects if we are in the models page and previous page was a provider
     */
    public detectProvider() {
        const url = new URL(document.referrer);
        if (url.pathname.startsWith("/provider/") 
                      && window.location.pathname.startsWith("/model/")) {
            this.provider = "provider";
        } else {
            this.provider = "";
        }
    }
}
