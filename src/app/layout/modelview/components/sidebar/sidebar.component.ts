import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatSliderModule, MatSliderChange } from '@angular/material/slider';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs/Subscription';

import {ModelInfoService, ModelPartStateChangeType } from '../../../../shared/services/model-info.service';
import {SidebarService, MenuStateChangeType, MenuChangeType } from '../../../../shared/services/sidebar.service';


const DISPLAY_CTRL_ON = 'block';
const DISPLAY_CTRL_OFF = 'none';

/**
 * Class used to display a sidebar with a menu tree, used to interact with the model
 */
@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent  implements OnInit, OnDestroy {
    public isActive = false;
    private showMenu = '';
    private pushRightClass: 'push-right';

    public title = '';
    private modelInfo = {};
    private modelPath = '';
    public groupList: Array<String> = [];
    private modelPartState = {};
    private displayControls = {};
    private value;
    private subscription: Subscription;


    constructor(private translate: TranslateService, private modelInfoService: ModelInfoService, private route: ActivatedRoute,
                public router: Router, private sideBarService: SidebarService) {
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
        // subscribe to component messages
       this.subscription = this.sideBarService.getMenuChanges().subscribe(changes => { this.revealMenuItem(changes); });
    }

    /**
     * Called upon initialisation, this reads the information about the model to be viewed
     * and initialises the sidebar with values
     */
    public ngOnInit() {
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

    /**
     * Opens up a particular menu item
     * @param changes
     */
    private revealMenuItem(changes: MenuChangeType) {
        if (changes.state === MenuStateChangeType.OPENED) {
            this.showMenu = changes.group;
            this.toggleControls(changes.group, changes.subGroup);
        }
    }

    /**
     * Reveals a part in the model
     * @param groupName model part's group name
     * @param partId model part's id
     * @param toggle reveal part (true) or hide (false)
     */
    private revealPart(groupName: string, partId: string, toggle: boolean) {
        this.modelInfoService.revealPart(groupName, partId, toggle);
    }

    /**
     * Changes height of a particular part of the model
     * @param event material slider change event, contains slider's latest selected value
     * @param groupName model part's group name
     * @param partId model part's id
     */
    private changeHeight(event: MatSliderChange, groupName: string, partId: string) {
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.HEIGHT_OFFSET, new_value: event.value } );
    }

    /**
     * Changes transparency of a part of the model
     * @param event material slider change event, contains slider's latest selected value
     * @param groupName model part's group name
     * @param partId model part's id
     */
    private changeTransparency(event: MatSliderChange, groupName: string, partId: string) {
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.TRANSPARENCY, new_value: event.value } );
    }

    /**
     * Opens up the controls for a part of the model within the sidebar
     * @param groupName model part's group name
     * @param partId model part's id
     */
    public toggleControls(groupName: string, partId: string) {
        if (this.displayControls[groupName][partId] === DISPLAY_CTRL_ON) {
            this.displayControls[groupName][partId] = DISPLAY_CTRL_OFF;
        } else {
            this.displayControls[groupName][partId] = DISPLAY_CTRL_ON;
        }
    }

    /**
     * Returns the state of the control panel (open/closed) for a part of the model
     * @param groupName model part's group name
     * @param partId model part's id
     */
    public getDisplayControls(groupName: string, partId: string) {
        return this.displayControls[groupName][partId];
    }

    /**
     * Toggles the visibility state of a checkbox associated with a part of the model
     * @param groupName model part's group name
     * @param partId model part's id
     * @param state desired checkbox state, on or off
     */
    public checkBoxClick(groupName: string, partId: string, state: boolean) {
        this.modelPartState[groupName][partId].displayed = state;
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.DISPLAYED, new_value: this.modelPartState[groupName][partId].displayed } );
    }

    /**
     * Change the state of the visibility checkboxes for a group of model parts
     * @param event click event for checkbox
     * @param groupName group name of model parts
     * @param state desired checkbox state
     */
    public groupCheckBoxClick(event: any, groupName: string, state: boolean) {
        event.stopPropagation();
        for (const partId in this.modelPartState[groupName]) {
            if (this.modelPartState[groupName].hasOwnProperty(partId)) {
                this.checkBoxClick(groupName, partId, state);
            }
        }
    }

    /**
     * Retrieves the state of the visibility checkboxes within a group
     * @param groupName group name of parts whose checkboxes we want the state of
     * @return true/false state of checkboxes. Returns true iff all checkboxes are ticked
     */
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

    /**
     * Expands group menu item
     * @param element
     */
    public addExpandClass(element: any) {
        if (element === this.showMenu) {
            this.showMenu = '0';
        } else {
            this.showMenu = element;
        }
    }

    /**
     * Returns true of sidebar is displayed
     * @returns true of sidebar is displayed
     */
    public isToggled(): boolean {
        const dom: Element = document.querySelector('body');
        return dom.classList.contains(this.pushRightClass);
    }

    /**
     * Toggles display of sidebar
     */
    public toggleSidebar() {
        const dom: any = document.querySelector('body');
        dom.classList.toggle(this.pushRightClass);
    }

    /**
     * Toggles layout from right-to-left <-> left-to-right
     */
    public rltAndLtr() {
        const dom: any = document.querySelector('body');
        dom.classList.toggle('rtl');
    }

    /**
     * Changes language
     */
    public changeLang(language: string) {
        this.translate.use(language);
    }

    /**
     * Destroys objects and unsubscribes to ensure no memory leaks
     */
    public ngOnDestroy() {
        this.subscription.unsubscribe();
    }
}
