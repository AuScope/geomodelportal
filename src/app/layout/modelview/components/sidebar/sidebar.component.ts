import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import {MatSliderModule} from '@angular/material/slider';
import { HttpErrorResponse } from '@angular/common/http';

import {ModelInfoService, ModelPartStateChangeType } from '../../../../shared/services/model-info.service';


@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent  implements OnInit {
    isActive = false;
    showMenu = '';
    showMenu2 = '';
    pushRightClass: 'push-right';

    title = '';
    modelInfo = {};
    modelPath = '';
    groupList: Array<String> = [];
    modelPartState = {};

    constructor(private translate: TranslateService, private modelInfoService: ModelInfoService, private route: ActivatedRoute,
                public router: Router) {
        this.translate.addLangs(['en', 'fr', 'ur', 'es', 'it', 'fa', 'de']);
        this.translate.setDefaultLang('en');
        const browserLang = this.translate.getBrowserLang();
        this.translate.use(browserLang.match(/en|fr|ur|es|it|fa|de/) ? browserLang : 'en');

        this.router.events.subscribe(val => {
            if (
                val instanceof NavigationEnd &&
                window.innerWidth <= 992 &&
                this.isToggled()
            ) {
                this.toggleSidebar();
            }
        });
    }

    ngOnInit() {
        const local = this;
        this.modelPath = this.route.snapshot.paramMap.get('modelPath');
        this.modelInfoService.getModelInfo(this.modelPath).then(
            data => {
                this.modelInfo = data as string [];
                this.title = this.modelInfo['properties'].name;
                this.groupList = Object.keys(this.modelInfo['groups']);
                this.modelPartState = this.modelInfoService.getModelPartStateObj();
            }
        );
    }

    checkBoxClick(groupName: string, modelUrl: string) {
        this.modelPartState[groupName][modelUrl].displayed = !this.modelPartState[groupName][modelUrl].displayed;
        this.modelInfoService.setModelPartStateChange(groupName, modelUrl,
            { type: ModelPartStateChangeType.DISPLAYED, new_value: this.modelPartState[groupName][modelUrl].displayed } );
    }

    eventCalled() {
        this.isActive = !this.isActive;
    }

    addExpandClass(element: any) {
        if (element === this.showMenu) {
            this.showMenu = '0';
        } else {
            this.showMenu = element;
        }
    }
    addExpandClass2(element: any) {
        if (element === this.showMenu2) {
            this.showMenu2 = '0';
        } else {
            this.showMenu2 = element;
        }
    }

    isToggled(): boolean {
        const dom: Element = document.querySelector('body');
        return dom.classList.contains(this.pushRightClass);
    }

    toggleSidebar() {
        const dom: any = document.querySelector('body');
        dom.classList.toggle(this.pushRightClass);
    }

    rltAndLtr() {
        const dom: any = document.querySelector('body');
        dom.classList.toggle('rtl');
    }

    changeLang(language: string) {
        this.translate.use(language);
    }

    onLoggedout() {
        localStorage.removeItem('isLoggedin');
    }
}
