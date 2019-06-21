import { Component, OnInit, Input } from '@angular/core';
import { MatSliderChange } from '@angular/material/slider';
import { ModelInfoService, ModelPartStateChangeType } from '../../../../../../shared/services/model-info.service';

@Component({
  selector: 'app-volumecontrols',
  templateUrl: './volumecontrols.component.html',
  styleUrls: ['./volumecontrols.component.scss']
})
export class VolumecontrolsComponent implements OnInit {
  @Input() dimIdx: number;
  @Input() groupName: string;
  @Input() partId: string;
  @Input() modelPath: string;
  @Input() modelInfoService: ModelInfoService;

  public sliderVal = [0.0, 0.0, 0.0];


  constructor() {

  }

  ngOnInit() {
  }

  /**
   * Changes slice of a volume
   * @param event material slider change event, contains slider's latest selected value
   */
  public changeSlices(event: MatSliderChange, dimIdx: number, groupName: string) {
      this.modelInfoService.setModelGroupStateChange(groupName,
              { type: ModelPartStateChangeType.VOLUME_SLICE, new_value: [dimIdx, event.value] } );
      this.sliderVal[dimIdx] = event.value;
  }


  public changeAllSlices(event: MatSliderChange, groupName: string, partId: string) {
      for (const dIdx of [0, 1, 2]) {
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.VOLUME_SLICE, new_value: [dIdx, event.value] } );
        this.sliderVal[dIdx] = event.value;
      }
  }

}
