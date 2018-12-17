import { Injectable } from '@angular/core';
import { Observable ,  Subject } from 'rxjs';

// NB: 1) 'END_TOUR' must always be the last item in the list
//     2) There is one of these for each help popover in the sidebar
export enum WidgetType { GROUP_TICKBOX, GROUP_TOGGLE, PART_TICKBOX, PART_CONFIG,
                          PART_OFFSET, PART_VISIBILITY, PART_EYEBALL, RESET_VIEW, MOUSE_GUIDE, COMPASS_ROSE, END_TOUR }

@Injectable()
export class HelpinfoService {

  private popoverSubObj = new Subject<any>();
  private modelSubObj = new Subject<any>();
  private widgetList: WidgetType[] = [];
  constructor() {}

  /**
   * Components with a popover can register their help facilities here.
   * If you are the first of your type to register, then you will get an observable
   * else you'll get null
   * @param widgetTypeList input your widget types as an array
   * @return an observable so that you know when its your turn to display a helpful hint or null
   */
  public waitForPopoverSignal(widgetTypeList: WidgetType[]): Observable<any> {
      // If 'widgetType' not in widgetList then include 'widgetType' in our list etc.
      let found = false;
      for (const widgetType of widgetTypeList) {
          if (this.widgetList.indexOf(widgetType) < 0) {
              this.widgetList.push(widgetType);
              found = true;
          }
      }
      // If you're the first to register
      if (found) {
          return this.popoverSubObj.asObservable();
      // return 'null' if we're not the first to register
      } else {
          return null;
      }
  }

  /**
   * This is called by the help component when it is doing a sidebar tour, it triggers the waiting object to
   * display a helpful hint or to stop display of helpful hint
   * @param seqNum determines which component is triggered, corresponds to the values in WidgetType enum
   */
  public triggerHelpPopover(seqNum: number) {
      this.popoverSubObj.next(seqNum);
  }

  /**
   * model view component calls this to wait for the signal to start and step through the model demonstration
   */
  public waitForModelDemo(): Observable<any> {
      return this.modelSubObj.asObservable();
  }

  /**
   * This is called by the help component when it is doing a model tour, it triggers the waiting object to
   * rotate or move the model and display information
   * @param seqNum determines which frame to display
   */
  public triggerModelDemo(seqNum: number) {
      this.modelSubObj.next(seqNum);
  }
}
