import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';

/**
 * Header component
 */
@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
    private translate: TranslateService;
    router: Router;

    pushRightClass = 'push-right';

    // Used to go back to main page via "Home" icon
    homePath = '/';
    provider = '';
    providerPath = '';

    constructor() {
        this.translate = inject(TranslateService);
        this.router = inject(Router);
        this.translate.addLangs(['en', 'fr', 'ur', 'es', 'it', 'fa', 'de', 'zh-CHS']);
        this.translate.setDefaultLang('en');
        const browserLang = this.translate.getBrowserLang();
        if (browserLang) {
          this.translate.use(browserLang.match(/en|fr|ur|es|it|fa|de|zh-CHS/) ? browserLang : 'en');
        }
        this.router.events.subscribe(val => {
            if (val instanceof NavigationEnd) {
                this.detectProvider();
                if (
                    window.innerWidth <= 992 &&
                    this.isToggled()
                ) {
                    this.toggleSidebar();
                }
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
     * Navigate to home page
     */
    navigateToHome(event?: Event) {
        event?.preventDefault();
        const target = this.homePath && this.homePath !== '/' ? this.homePath : '/';
        this.router.navigate([target], { replaceUrl: true });
    }

    /**
     * Navigate to provider
     */
    navigateToProvider(event?: Event) {
        event?.preventDefault();
        const target = this.providerPath ? ['/provider', this.providerPath] : ['/provider'];
        this.router.navigate(target, { replaceUrl: true });
    }

    /**
     * Normalize the path by removing the pre-path if it exists and ensuring it starts with a '/'
     * @param path the original path
     * @returns thenormalized path
     */
    private normalizePath(path: string): string {
        const basePath = environment.usePrePath ? environment.prePath : '';
        const normalizedPath = path.startsWith(basePath) ? path.slice(basePath.length) : path;
        return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
    }

    /**
     * Detects if in the models page and previous page was a provider
     */
    public detectProvider() {
        const navigationState = (this.router.currentNavigation()?.extras.state ?? window.history.state) as { fromProvider?: boolean; providerPath?: string } | undefined;
        const currentPath = this.normalizePath(this.router.url || window.location.pathname);
        const referrerPath = document.referrer ? this.normalizePath(new URL(document.referrer).pathname) : '';

        if (navigationState?.fromProvider || (referrerPath.startsWith('/provider/') && currentPath.startsWith('/model/'))) {
            this.provider = 'provider';
            this.providerPath = navigationState?.providerPath || (referrerPath.startsWith('/provider/') ? referrerPath.replace('/provider/', '') : '');
        } else {
            this.provider = '';
            this.providerPath = '';
        }
    }
}
