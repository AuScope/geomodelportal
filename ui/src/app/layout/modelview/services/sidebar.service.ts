import { Injectable } from '@angular/core';
import { Observable ,  Subject } from 'rxjs';

// Is a menu item in the sidebar open or closed?
export enum  MenuStateChangeType { OPENED, CLOSED, NEW_PART, ALL_BAR_ONE }

// Stores which menu item changed and what its current state is
export interface MenuChangeType { group: string; subGroup: string; state: MenuStateChangeType; }

/**
 * Used to share state changes in the sidebar menu tree between components
 */
@Injectable()
export class SidebarService {

    private menuChangeSub = new Subject<any>();

    constructor() { }

    /**
     * Call this to notify the service that a menu item has changed state
     * @param menuChange contains information about which menu item changed and what is state is
     */
    public changeMenuState(menuChange: MenuChangeType) {
        this.menuChangeSub.next(menuChange);
    }

    /**
     * Call this to get informed of any changes in menu state
     * @return an observable of the menu item state
     */
    public getMenuChanges(): Observable<any> {
        return this.menuChangeSub.asObservable();
    }

}
