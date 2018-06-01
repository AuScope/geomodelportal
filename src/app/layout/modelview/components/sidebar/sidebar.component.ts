import { Component, OnInit, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatSliderModule, MatSliderChange } from '@angular/material/slider';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { NgbPopover} from '@ng-bootstrap/ng-bootstrap';

import { ModelInfoService, ModelPartStateChangeType } from '../../../../shared/services/model-info.service';
import { SidebarService, MenuStateChangeType, MenuChangeType } from '../../../../shared/services/sidebar.service';
import { HelpinfoService, WidgetType } from '../../../../shared/services/helpinfo.service';


const DISPLAY_CTRL_ON = 'block';
const DISPLAY_CTRL_OFF = 'none';



/**
 * Class used to display a sidebar with a menu tree, used to interact with the model
 */
@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    encapsulation: ViewEncapsulation.None // NB: Needed to style the popovers
})
export class SidebarComponent  implements OnInit, OnDestroy {
    public isActive = false;
    private showMenu = '';
    private pushRightClass: 'push-right';

    public title = '';
    private modelInfo = {};
    private modelPath = '';
    public groupList: Array<string> = [];
    private modelPartState = {};
    private displayControls = {};
    private helpSubscr: Subscription;
    private compSubscr: Subscription;
    private helpObs: Observable<any> = null;

    // These are all the help message for the sidebar
    private groupVisToggle = { title: 'Toggle Group Visibility', desc: 'Click on this tick box to hide/display groups of objects.' };
    private groupMenuToggle = { title: 'Group Menu Toggle', desc: 'Click on this to hide/display objects within a group' };
    private partConfigToggle = { title: 'Controls', desc: 'Click here to reveal the controls for this part of the model' };
    private partEyeball = { title: 'Reveal a model part', desc: 'To reveal this part, move your mouse over the eyeball icon' };
    private partOffset = { title: 'Adjust height offset', desc: 'To adjust this part\'s height, move this slider by clicking or dragging' };
    private partTransp = { title: 'Adjust transparency',
                           desc: 'To adjust this part\'s transparency, move this slider by clicking or dragging' };
    private partTick = { title: 'Toggle Part visibility', desc: 'Click on this tick box to hide/display this part' };

    @ViewChild('group_tick_popover') public groupTickPopover: NgbPopover = null;
    @ViewChild('group_menu_popover') public groupMenuPopover: NgbPopover = null;
    @ViewChild('part_config_popover') public partConfigPopover: NgbPopover = null;
    @ViewChild('part_eyeball_popover') public partEyeballPopover: NgbPopover = null;
    @ViewChild('part_offset_popover') public partOffsetPopover: NgbPopover = null;
    @ViewChild('part_trans_popover') public partTransPopover: NgbPopover = null;
    @ViewChild('part_tick_popover') public partTickPopover: NgbPopover = null;



    constructor(private translate: TranslateService, private modelInfoService: ModelInfoService, private route: ActivatedRoute,
                public router: Router, private sideBarService: SidebarService, private helpinfoService: HelpinfoService) {
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
        // Subscribe to component messages
        this.compSubscr = this.sideBarService.getMenuChanges().subscribe(changes => { this.revealMenuItem(changes); });

        // Subscribe to help hint triggers
        // When trigger occurs, a sidebar component will display its help information
        this.helpObs = this.helpinfoService.waitForPopoverSignal([WidgetType.GROUP_TICKBOX]);
        if (this.helpObs != null) {
            this.helpSubscr = this.helpObs.subscribe(seqNum => { this.showHelpHints(seqNum); });
        }
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
                this.modelInfo = data[0] as string [];
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
     * This is called by the subscription to the help info service
     * It a state machine that displays popovers for various parts of the model view
     * @param seqNum sequnce number
     */
    private showHelpHints(seqNum: number) {
        // NB: This list must contain all the ViewChild popovers above  & in the correct order
        // The order must correspond to the WidgetType enum
        const popoverList = [ this.groupTickPopover, this.groupMenuPopover, this.partConfigPopover,
                             this.partEyeballPopover, this.partOffsetPopover, this.partTransPopover, this.partTickPopover ];
        // Open up menu items at first group
        if (seqNum === 0 && this.groupList.length > 0) {
            this.revealFirstMenus(true);
        }
        // Open new help info
        if (seqNum < popoverList.length && popoverList[seqNum] !== null) {
            popoverList[seqNum].open();
        }
        // Close old help info
        if (seqNum > 0 && seqNum <= popoverList.length && popoverList[seqNum - 1] !== null) {
            popoverList[seqNum - 1].close();
        }
        // Close everything if user terminates the tour
        if (seqNum === WidgetType.END_TOUR) {
            for (const popover of popoverList) {
                if (popover !== null && popover.isOpen()) {
                    popover.close();
                }
            }
            // Closes menu item
            this.showMenu = null;
            this.revealFirstMenus(false);
        }
    }

    /**
      * Open and closes the first menu item and first descendants for use by the popover
      * @param open if true then opens menus else closes them
      */
    private revealFirstMenus(open: boolean) {
        if (this.groupList.length > 0) {
            // Find first menu item and first descendants
            const firstGroupName = this.groupList[0];
            let firstPartId: string = null;
            if (this.modelInfo['groups'][firstGroupName].length > 0) {
                firstPartId = this.modelInfo['groups'][firstGroupName][0].model_url;
            }
            // Open first menu and first descendants
            if (open) {
                this.showMenu = firstGroupName;
                if (firstPartId !== null) {
                    this.displayControls[firstGroupName][firstPartId] = DISPLAY_CTRL_ON;
                }
            // Close first menu and first descendants
            } else {
                this.showMenu = null;
                if (firstPartId !== null) {
                    this.displayControls[firstGroupName][firstPartId] = DISPLAY_CTRL_OFF;
                }
            }
        }
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
        this.compSubscr.unsubscribe();
        this.helpSubscr.unsubscribe();
    }
}
