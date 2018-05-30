import { Component, OnInit } from '@angular/core';
import { HelpinfoService, WidgetType } from '../../../../shared/services/helpinfo.service';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss']
})
export class HelpComponent {

  public buttonStr = 'Take a website tour!';
  private tourStarted = false;
  private helpItemCount = -1;
  constructor(private helpinfoService: HelpinfoService) {

  }

  /**
    * Starts and progresses a tour of the sidebar controls
    */
  public doTour() {
      // Starts tour
      if (!this.tourStarted) {
          this.tourStarted = true;
          this.buttonStr = 'Next';
          this.helpItemCount = 0;
          this.helpinfoService.triggerHelp(this.helpItemCount);
      } else {
          // Progresses tour
          this.helpItemCount += 1;
          if (this.helpItemCount <= WidgetType.END_TOUR) {
              this.helpinfoService.triggerHelp(this.helpItemCount);
          }
          // Ends tour
          if (this.helpItemCount === WidgetType.END_TOUR) {
              this.reset();
          }
      }
  }

  /**
    * Stops the tour of the sidebar controls
    */
  public endTour() {
      this.helpinfoService.triggerHelp(WidgetType.END_TOUR);
      this.reset();
  }

  /**
    * Resets the state of the tour buttons
    */
  private reset() {
      this.buttonStr = 'Take a website tour!';
      this.helpItemCount = -1;
      this.tourStarted = false;
  }

}
