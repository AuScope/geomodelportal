import { Component, OnInit, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatSliderChange } from '@angular/material/slider';
import { Subscription ,  Observable } from 'rxjs';
import { NgbPopover} from '@ng-bootstrap/ng-bootstrap';

import { ModelInfoService, ModelPartStateChangeType } from '../../../../shared/services/model-info.service';
import { SidebarService, MenuStateChangeType, MenuChangeType } from '../../services/sidebar.service';
import { HelpinfoService, WidgetType } from '../../services/helpinfo.service';


// Used to control visibility of parts in the menu
const DISPLAY_CTRL_ON = 'block';
const DISPLAY_CTRL_OFF = 'none';

/**
 * Class used to display a sidebar with a menu tree, used to interact with the model
 * Sidebar has groups. Within each group there are parts.
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

    // Name of model
    public title = '';

    // Name organisation where model comes from
    public sourceOrgName = '';

    // Information taken from model configuration input file
    private modelConfig = {};

    // Part of the URL which specifies the model name
    private modelPath = '';

    // List of group names in sidebar
    public groupList: Array<string> = [];

    // State of each part, whether it is displayed or not
    // (initally copied from model info service, then any changes are relayed back to model info service)
    private modelPartState = {};

    // Used to toggle the display of menu items (e.g. Height, Transparency) for the parts within the groups
    private displayControls = {};

    // Subscribe to the help info service
    private helpSubscr: Subscription;

    // Subscribe to the sidebar service so that menu items can be revealed by double clicking in the viewing area
    private compSubscr: Subscription;

    // Menu items use this to trigger the display of help information
    private helpObs: Observable<any> = null;

    // State of the mouse guide toggle button
    public mouseGuideBtnState = false;

    // State of the compass rose toggle button
    public compassRoseBtnState = true;

    // These are all the help messages for the sidebar
    public HELP_TEXT = {
        groupVisToggle: { title: 'Toggle Group Visibility',
                              desc: 'Click on this tick box to hide/display groups of model parts in the viewing area.' },
        groupMenuToggle: { title: 'Group Menu Toggle',
                               desc: 'Click on this to open/close view of parts within a group menu.' },
        partConfigToggle: { title: 'Open/Close Model Part Controls',
                                desc: 'Click here to open/close the control panel for this model part.' },
        partZoom: { title: 'Zoom to View a Model Part',
                          desc: 'Click here to zoom in and view a model part.' },
        partDownload: { title: 'Download a Model Part',
                          desc: 'Click here to download a model part.' },
        partEyeball: { title: 'Reveal a Hidden Model Part',
                           desc: 'To reveal a hidden model part in the viewing area, move your mouse over its eyeball icon.' },
        partOffset: { title: 'Adjust Height Offset',
                          desc: 'To adjust this model part\'s height, move this slider by clicking or dragging.' },
        partTransp: { title: 'Adjust Transparency',
                          desc: 'To adjust this model part\'s transparency, move this slider by clicking or dragging.' },
        partHeightScale: { title: 'Adjust Height Scale',
                            desc: 'To exaggerate the height, move this slider by clicking or dragging.'},
        partTick: { title: 'Toggle Part Visibility',
                        desc: 'Click on this tick box to hide/display this model part in the viewing area.' },
        resetView: { title: 'Reset Model View',
                         desc: 'Click on this button to reset the view of the model back to its original state.' },
        mouseGuide: { title: 'Turn on/off Mouse Guide',
                          desc: 'Click on this to hide/display the circle that helps guide the mouse when rotating the model' },
        compassRose: { title: 'Toggle the Compass Rose Visibility',
                          desc: 'Click on this to hide/display the compass rose' }
    };

    // These refer to each help popover in the sidebar
    // NB: If you add a new popover, you must also add a new enum value to WidgetType in 'helpinfo.service'
    @ViewChild('group_tick_popover') public groupTickPopover: NgbPopover = null;
    @ViewChild('group_menu_popover') public groupMenuPopover: NgbPopover = null;
    @ViewChild('part_config_popover') public partConfigPopover: NgbPopover = null;
    @ViewChild('part_zoom_popover') public partZoomPopover: NgbPopover = null;
    @ViewChild('part_download_popover') public partDownloadPopover: NgbPopover = null;
    @ViewChild('part_eyeball_popover') public partEyeballPopover: NgbPopover = null;
    @ViewChild('part_offset_popover') public partOffsetPopover: NgbPopover = null;
    @ViewChild('part_trans_popover') public partTransPopover: NgbPopover = null;
    @ViewChild('part_scale_popover') public partScalePopover: NgbPopover = null;
    @ViewChild('part_tick_popover') public partTickPopover: NgbPopover = null;
    @ViewChild('reset_view_popover', { static: true }) public resetViewPopover: NgbPopover = null;
    @ViewChild('mouse_guide_popover', { static: true }) public mouseGuidePopover: NgbPopover = null;
    @ViewChild('compass_rose_popover', { static: true }) public compassRosePopover: NgbPopover = null;



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
        this.compSubscr = this.sideBarService.getMenuChanges().subscribe(changes => { this.changeMenuItem(changes); });

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
        this.modelPath = this.route.snapshot.paramMap.get('modelPath');
        this.modelInfoService.getModelInfo(this.modelPath).then(
            data => {
                this.modelConfig = data[0] as string [];
                this.sourceOrgName = data[2];
                this.title = this.modelConfig['properties'].name;
                this.groupList = Object.keys(this.modelConfig['groups']);
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
            },
            // Must catch here to prevent error message appearing on console
            err => {
                console.error('Cannot read model file', this.modelPath, err);
            }
        );
    }

    /**
     * This is called by the subscription to the help info service
     * It a state machine that displays popovers for various parts of the model view
     * @param seqNum sequnce number
     */
    private showHelpHints(seqNum: number) {
        // NB: This list must contain all the ViewChild popovers above and in the correct order
        // The order must correspond to the WidgetType enum
        const popoverList: NgbPopover[] = [ this.groupMenuPopover, this.groupTickPopover, this.partTickPopover,
          this.partConfigPopover, this.partDownloadPopover, this.partEyeballPopover, this.partZoomPopover,
          this.partTransPopover, this.partOffsetPopover, this.partScalePopover,  this.resetViewPopover,
          this.mouseGuidePopover, this.compassRosePopover ];

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

            // Find included first groupName menu item and first partId descendants
            let firstGroupName: string = null;
            let firstPartId: string = null;
            let done = false;
            for (const groupName of this.groupList) {
                const partObjList = this.modelConfig['groups'][groupName];
                for (const partObj of partObjList) {
                    if (partObj.include && partObj.type === 'GLTFObject') {
                        firstGroupName = groupName;
                        firstPartId = partObj.model_url;
                        done = true;
                        break;
                    }
                }
                if (done) {
                    break;
                }
            }
            if (!done) {
                return;
            }

            // Control panel used by demo will not open, unless it is ticked (displayed), so must enable it
            if (open && !this.getGroupTickBoxChecked(firstGroupName)) {
                for (const partId in this.modelPartState[firstGroupName]) {
                    if (this.modelPartState[firstGroupName].hasOwnProperty(partId)) {
                        this.checkBoxClick(firstGroupName, partId, true);
                    }
                }
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
     * Make everything invisible but one part
     * @param groupName model part's group name
     * @param partId model part's id
     */
    private makeInvisibleBarOne(groupName: string, partId: string) {
        if (this.groupList.length > 0) {
            for (const gName of this.groupList) {
                // If not target group, then make invisible
                if (groupName !== gName && this.getGroupTickBoxChecked(gName)) {
                    for (const pId in this.modelPartState[gName]) {
                        if (this.modelPartState[gName].hasOwnProperty(pId)) {
                            this.checkBoxClick(gName, pId, false);
                        }
                    }
                // If target group, then make invisible, except target partId
                } else {
                    for (const pId in this.modelPartState[gName]) {
                        if (this.modelPartState[gName].hasOwnProperty(pId)) {
                            const state = (partId === pId);
                            this.checkBoxClick(gName, pId, state);
                        }
                    }
                }
            }
        }
    }

    /**
     * Used by external services to open up a particular menu item or add a new menu item
     * @param changes what type of change is desired
     */
    private changeMenuItem(changes: MenuChangeType) {
        // Open up a menu items
        if (changes.state === MenuStateChangeType.OPENED) {
            this.showMenu = changes.group;
            this.toggleControls(changes.group, changes.subGroup, true);
        // Add a new menu item and a group if necessary
        } else if (changes.state === MenuStateChangeType.NEW_PART) {
            if (this.groupList.indexOf(changes.group) === -1) {
                this.addGroup(changes.group);
            }
            this.addPart(changes.group, changes.subGroup);
        // Make everything invisible except one part
        } else if (changes.state === MenuStateChangeType.ALL_BAR_ONE) {
            this.makeInvisibleBarOne(changes.group, changes.subGroup);
        }
    }

    /**
     * Adds a group (that does not from the model config) to the sidebar
     * @param groupName model part's group name
     */
    private addGroup(groupName: string) {
        this.displayControls[groupName] = {};
        this.groupList.push(groupName);
        this.modelInfoService.addGroup(groupName);
        this.modelConfig['groups'][groupName] = [];
    }

    /**
     * Adds a part (that does not from the model config) to the sidebar
     * @param groupName model part's group name
     * @param partId model part's id
     */
    private addPart(groupName: string, partId: string) {
        // Tells model info service that there is a new part
        this.modelInfoService.addPart(groupName, partId, true, 0.0);
        // Update our record of the model part state objects
        this.modelPartState = this.modelInfoService.getModelPartStateObj();
        // This model part will be displayed
        this.displayControls[groupName][partId] = DISPLAY_CTRL_ON;
        // Update our copy of the model config file
        this.modelConfig['groups'][groupName].push({ 'display_name': partId,
                                                       'displayed': true,
                                                       'include': true,
                                                       'model_url': partId,
                                                       'type': 'GLTFObject' });
    }

    /**
     * Reveals a part in the model
     * @param groupName model part's group name
     * @param partId model part's id
     * @param toggle reveal part (true) or hide (false)
     */
    public revealPart(groupName: string, partId: string, toggle: boolean) {
        this.modelInfoService.revealPart(groupName, partId, toggle);
    }


    /**
     * Zooms in to view a part of the model, and makes all other parts invisible
     * @param groupName model part's group name
     * @param partId model part's id
     */
    public zoomToPart(groupName: string, partId: string) {
        this.modelInfoService.zoomToPart(groupName, partId);
        this.makeInvisibleBarOne(groupName, partId);
    }


    /**
     * Downloads models part
     * @param groupName model part's group name
     * @param partId model part's id
     */
    public downloadPart(groupName: string, partId: string) {
        console.log("DOWNLOADING: ", groupName, partId);
    }
     

    /**
     * Changes height of a particular part of the model
     * @param event material slider change event, contains slider's latest selected value
     * @param groupName model part's group name
     * @param partId model part's id
     */
    public changeHeightOffset(event: MatSliderChange, groupName: string, partId: string) {
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.HEIGHT_OFFSET, new_value: event.value } );
    }


    /**
     * Changes height scale of a particular part of the model
     * @param event material slider change event, contains slider's latest selected value
     * @param groupName model part's group name
     * @param partId model part's id
     */
    public changeHeightScale(event: MatSliderChange, groupName: string, partId: string) {
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.RESCALE, new_value: event.value } );
    }

    /**
     * Changes transparency of a part of the model
     * @param event material slider change event, contains slider's latest selected value
     * @param groupName model part's group name
     * @param partId model part's id
     */
    public changeTransparency(event: MatSliderChange, groupName: string, partId: string) {
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.TRANSPARENCY, new_value: event.value } );
    }

    /**
     * Opens up the controls for a part of the model within the sidebar, but
     * only if the part is displayed in viewing area
     * @param groupName model part's group name
     * @param partId model part's id
     * @param alwaysOn (optional) if true, then the menu is not toggled, but stays open
     */
    public toggleControls(groupName: string, partId: string, alwaysOn = false) {
        if (!alwaysOn && this.displayControls[groupName][partId] === DISPLAY_CTRL_ON) {
            this.displayControls[groupName][partId] = DISPLAY_CTRL_OFF;
        } else if (this.modelPartState[groupName][partId].displayed) {
            this.displayControls[groupName][partId] = DISPLAY_CTRL_ON;
        }
    }

    /**
     * Returns the state of the control panel (open/closed) for a part of the model
     * @param groupName model part's group name
     * @param partId model part's id
     */
    public getDisplayControls(groupName: string, partId: string): string {
        if (!this.modelPartState[groupName][partId].displayed) {
            this.displayControls[groupName][partId] = DISPLAY_CTRL_OFF;
        }
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
        // If making part invisible, then collapse the control panel
        if (!state) {
            this.displayControls[groupName][partId] = DISPLAY_CTRL_OFF;
        }
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
        if (event) {
            event.stopPropagation();
        }
        for (const partId in this.modelPartState[groupName]) {
            if (this.modelPartState[groupName].hasOwnProperty(partId)) {
                this.checkBoxClick(groupName, partId, state);
            }
        }
    }


    /**
     * Called when the "ALL" checkbox is clicked on
     * @param state desired state of checkbox
     */
    public allCheckBoxClick(state: boolean) {
        if (this.groupList.length > 0) {
            for (const gName of this.groupList) {
                this.groupCheckBoxClick(null, gName, state);
            }
        }
    }

    /**
     * Returns true if all group checkboxes are ticked
     */
    public getAllTickBoxChecked() {
        if (this.groupList.length > 0) {
            for (const gName of this.groupList) {
                if (!this.getGroupTickBoxChecked(gName)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Returns the 'checked' state of all the visibility checkboxes within a group
     * @param groupName group name of parts whose checkboxes we want the state of
     * @return Returns true iff all checkboxes are ticked
     */
    public getGroupTickBoxChecked(groupName: string) {
        for (const partId in this.modelPartState[groupName]) {
            if (this.modelPartState[groupName].hasOwnProperty(partId)) {
                if (!this.modelPartState[groupName][partId].displayed) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Returns true if one or more tickboxes are checked within a given group
     * @param groupName group name
     * @return Returns true if one of more tickboxes are checked within a group
     */
    public isSomeTickboxChecked(groupName: string) {
        let count = 0;
        for (const partId in this.modelPartState[groupName]) {
            if (this.modelPartState[groupName].hasOwnProperty(partId)) {
                if (this.modelPartState[groupName][partId].displayed) {
                    count++;
                    if (count > 1) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Returns the 'indeterminate' state of the visibility checkboxes within a group
     * @param groupName group name of parts whose checkboxes we want the state of
     * @return Returns true iff there are some checkboxes ticked and some are not
     */
    public  getGroupTickBoxIndet(groupName: string) {
        let onState = false, offState = false;
        for (const partId in this.modelPartState[groupName]) {
            if (this.modelPartState[groupName].hasOwnProperty(partId)) {
                if (!this.modelPartState[groupName][partId].displayed) {
                    offState = true;
                } else {
                    onState = true;
                }
                if (onState && offState) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Resets the view of the model back to its original state
     */
    public resetModelView() {
        this.modelInfoService.resetModelView();
    }

    /**
     * Toggles the state of the mouse guide (displayed/hidden)
     */
    public toggleMouseGuide() {
        this.mouseGuideBtnState = !this.mouseGuideBtnState;
        this.modelInfoService.displayMouseGuide(this.mouseGuideBtnState);
    }

    /**
     * Toggles the state of the compass rose (displayed/hidden)
     */
    public toggleCompassRose() {
        this.compassRoseBtnState = !this.compassRoseBtnState;
        this.modelInfoService.displayCompassRose(this.compassRoseBtnState);
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
