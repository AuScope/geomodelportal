import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatSliderModule, MatSliderChange } from '@angular/material/slider';
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
    public isActive = false;
    private showMenu = '';
    private showMenu2 = '';
    private pushRightClass: 'push-right';

    public title = '';
    private modelInfo = {};
    private modelPath = '';
    public groupList: Array<String> = [];
    private modelPartState = {};
    private displayControls = {};
    private value;


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
                        for (const partId in this.modelPartState[groupName]) {
                            if (this.modelPartState[groupName].hasOwnProperty(partId)) {
                                this.displayControls[groupName][partId] = DISPLAY_CTRL_OFF;
                            }
                        }
                    }
                }
            }
        );
    }

    private changeHeight(event: MatSliderChange, groupName: string, partId: string) {
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.HEIGHT_OFFSET, new_value: event.value } );
    }

    private changeTransparency(event: MatSliderChange, groupName: string, partId: string) {
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.TRANSPARENCY, new_value: event.value } );
    }

    public toggleControls(groupName: string, partId: string) {
        if (this.displayControls[groupName][partId] === DISPLAY_CTRL_ON) {
            this.displayControls[groupName][partId] = DISPLAY_CTRL_OFF;
        } else {
            this.displayControls[groupName][partId] = DISPLAY_CTRL_ON;
        }
    }

    public getDisplayControls(groupName: string, partId: string) {
        return this.displayControls[groupName][partId];
    }

    public checkBoxClick(groupName: string, partId: string, state: boolean) {
        this.modelPartState[groupName][partId].displayed = state;
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.DISPLAYED, new_value: this.modelPartState[groupName][partId].displayed } );
    }

    public groupCheckBoxClick(event: any, groupName: string, state: boolean) {
        event.stopPropagation();
        for (const partId in this.modelPartState[groupName]) {
            if (this.modelPartState[groupName].hasOwnProperty(partId)) {
                this.checkBoxClick(groupName, partId, state);
            }
        }
    }

    public getGroupTickBoxState(groupName: string) {
        let state = true;
        for (const partId in this.modelPartState[groupName]) {
            if (this.modelPartState[groupName].hasOwnProperty(partId)) {
                if (!this.modelPartState[groupName][partId].displayed) {
                    state = false;
                    break;
                }
            }
        }
        return state;
    }

    public eventCalled() {
        this.isActive = !this.isActive;
    }

    public addExpandClass(element: any) {
        if (element === this.showMenu) {
            this.showMenu = '0';
        } else {
            this.showMenu = element;
        }
    }

    public addExpandClass2(element: any) {
        if (element === this.showMenu2) {
            this.showMenu2 = '0';
        } else {
            this.showMenu2 = element;
        }
    }

    public isToggled(): boolean {
        const dom: Element = document.querySelector('body');
        return dom.classList.contains(this.pushRightClass);
    }

    public toggleSidebar() {
        const dom: any = document.querySelector('body');
        dom.classList.toggle(this.pushRightClass);
    }

    public rltAndLtr() {
        const dom: any = document.querySelector('body');
        dom.classList.toggle('rtl');
    }

    public changeLang(language: string) {
        this.translate.use(language);
    }
}
