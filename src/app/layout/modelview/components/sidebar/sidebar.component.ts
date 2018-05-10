import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatSliderModule} from '@angular/material/slider';
import { HttpErrorResponse } from '@angular/common/http';

import {ModelInfoService, ModelPartStateChangeType } from '../../../../shared/services/model-info.service';


const DISPLAY_CTRL_ON = 'block';
const DISPLAY_CTRL_OFF = 'none';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent  implements OnInit {
    private isActive = false;
    private showMenu = '';
    private showMenu2 = '';
    private pushRightClass: 'push-right';

    private title = '';
    private modelInfo = {};
    private modelPath = '';
    private groupList: Array<String> = [];
    private modelPartState = {};
    private displayControls = {};


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
                this.displayControls = {};
                for (const groupName in this.modelPartState) {
                    if (this.modelPartState.hasOwnProperty(groupName)) {
                        this.displayControls[groupName] = {};
                        for (const modelUrl in this.modelPartState[groupName]) {
                            if (this.modelPartState[groupName].hasOwnProperty(modelUrl)) {
                                this.displayControls[groupName][modelUrl] = DISPLAY_CTRL_OFF;
                            }
                        }
                    }
                }
            }
        );
    }

    toggleControls(groupName, modelUrl) {
        if (this.displayControls[groupName][modelUrl] === DISPLAY_CTRL_ON) {
            this.displayControls[groupName][modelUrl] = DISPLAY_CTRL_OFF;
        } else {
            this.displayControls[groupName][modelUrl] = DISPLAY_CTRL_ON;
        }
    }

    getDisplayControls(groupName, modelUrl) {
        return this.displayControls[groupName][modelUrl];
    }

    checkBoxClick(groupName: string, modelUrl: string, state: boolean) {
        this.modelPartState[groupName][modelUrl].displayed = state;
        this.modelInfoService.setModelPartStateChange(groupName, modelUrl,
            { type: ModelPartStateChangeType.DISPLAYED, new_value: this.modelPartState[groupName][modelUrl].displayed } );
    }

    groupCheckBoxClick(event: any, groupName: string, state: boolean) {
        event.stopPropagation();
        for (const modelUrl in this.modelPartState[groupName]) {
            if (this.modelPartState[groupName].hasOwnProperty(modelUrl)) {
                this.checkBoxClick(groupName, modelUrl, state);
            }
        }
    }

    getGroupTickBoxState(groupName: string) {
        let state = true;
        for (const modelUrl in this.modelPartState[groupName]) {
            if (this.modelPartState[groupName].hasOwnProperty(modelUrl)) {
                if (!this.modelPartState[groupName][modelUrl].displayed) {
                    state = false;
                    break;
                }
            }
        }
        return state;
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

}
