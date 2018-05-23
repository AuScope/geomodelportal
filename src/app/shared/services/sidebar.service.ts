import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

// What has changed in the sidebar menu's state?
export enum  MenuStateChangeType { OPENED, CLOSED }
export interface MenuChangeType { group: string; subGroup: string; state: MenuStateChangeType; }

@Injectable()
export class SidebarService {

    private menuChangeSub = new Subject<any>();

    constructor() { }

    changeMenuState(menuChange: MenuChangeType) {
        this.menuChangeSub.next(menuChange);
    }

    getMenuChanges(): Observable<any> {
        return this.menuChangeSub.asObservable();
    }

}
