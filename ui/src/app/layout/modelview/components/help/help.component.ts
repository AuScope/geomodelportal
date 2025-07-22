import { Component } from '@angular/core';
import { HelpinfoService, WidgetType } from '../../services/helpinfo.service';


const SIDEBAR_INIT_MSG = 'Sidebar controls tour';
const MODEL_INIT_MSG = 'Model demonstration';

@Component({
    selector: 'app-help',
    templateUrl: './help.component.html',
    styleUrls: ['./help.component.scss'],
    standalone: false
})
export class HelpComponent {

  public sidebarButtonStr = SIDEBAR_INIT_MSG;
  public sidebarTourStarted = false;
  public modelButtonStr = MODEL_INIT_MSG;
  public modelDemoStarted = false;
  private helpItemCount = -1;
  private modelDemoSeqNum = -1;

  constructor(private helpinfoService: HelpinfoService) {

  }

  /**
   * Starts and progresses a tour of the sidebar controls
   */
  public doSidebarTour() {
      // Starts tour
      if (!this.sidebarTourStarted) {
          this.sidebarTourStarted = true;
          this.sidebarButtonStr = 'Next';
          this.helpItemCount = 0;
          this.helpinfoService.triggerHelpPopover(this.helpItemCount);
      } else {
          // Progresses tour
          this.helpItemCount += 1;
          if (this.helpItemCount <= WidgetType.END_TOUR) {
              this.helpinfoService.triggerHelpPopover(this.helpItemCount);
          }
          // Ends tour
          if (this.helpItemCount === WidgetType.END_TOUR) {
              this.resetSidebarTour();
          }
      }
  }

  /**
   * Runs the model demonstration
   */
  public doModelDemo() {
      // Starts demonstration
      if (!this.modelDemoStarted) {
          this.modelDemoStarted = true;
          this.modelButtonStr = 'Next';
          this.modelDemoSeqNum = 0;
          this.helpinfoService.triggerModelDemo(this.modelDemoSeqNum);
      } else {
          // Progresses demonstration
          this.modelDemoSeqNum += 1;
          if (this.modelDemoSeqNum <= 3) {
              this.helpinfoService.triggerModelDemo(this.modelDemoSeqNum);
          }
          // Ends demonstration
          if (this.modelDemoSeqNum === 3) {
              this.resetModelDemo();
          }
      }
  }

  /**
   * Stops the tour of the sidebar controls
   */
  public endSidebarTour() {
      this.resetSidebarTour();
  }

  /**
   * Stops the demonstration of the model controls
   */
  public endModelDemo() {
      this.helpinfoService.triggerModelDemo(3);
      this.resetModelDemo();
  }

  /**
   * Resets model demonstration
   */
  private resetModelDemo() {
      this.modelDemoSeqNum = -1;
      this.modelDemoStarted = false;
      this.modelButtonStr = MODEL_INIT_MSG;
  }

  /**
   * Resets the state of the sidebar tour buttons
   */
  private resetSidebarTour() {
      this.sidebarButtonStr = SIDEBAR_INIT_MSG;
      this.helpItemCount = -1;
      this.sidebarTourStarted = false;
  }

  /**
   * Returns true iff a model demo is in progress
   * @return true iff a model demo is in progress else false
   */
  public isDoingModelDemo() {
      return this.modelDemoSeqNum !== -1;
  }

  /**
   * Returns true iff a sidebar tour is in progress
   * @return true iff a sidebar tour is in progress else false
   */
  public isDoingSidebarTour() {
      return  this.helpItemCount !== -1;
  }

}
