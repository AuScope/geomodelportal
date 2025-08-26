import { Component, Input } from '@angular/core';
import {FormsModule} from '@angular/forms';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { ModelInfoService, ModelPartStateChangeType } from '../../../../../../shared/services/model-info.service';

@Component({
    selector: 'app-volumecontrols',
    templateUrl: './volumecontrols.component.html',
    styleUrls: ['./volumecontrols.component.scss'],
    imports: [MatSlider, MatSliderThumb, FormsModule]
})
export class VolumecontrolsComponent {
  @Input() dimIdx: number;
  @Input() groupName: string;
  @Input() partId: string;
  @Input() modelPath: string;
  @Input() modelInfoService: ModelInfoService;

  /**
   * Changes slice of a volume
   * @param value contains slider's latest selected value
   * @param dimIdx dimension number X=0, Y=1, Z=2
   * @param groupName name of group

   */
  public changeSlices(value: number, dimIdx: number, groupName: string) {
      this.modelInfoService.setModelGroupStateChange(groupName,
              { type: ModelPartStateChangeType.VOLUME_SLICE, new_value: [dimIdx, value] } );
  }

  /**
   * Changes all slices in a group
   * @param value contains slider's latest selected value
   * @param groupName name of group
   * @param partId model part id
   */
  public changeAllSlices(value: number, groupName: string, partId: string) {
      for (const dIdx of [0, 1, 2]) {
        this.modelInfoService.setModelPartStateChange(groupName, partId,
            { type: ModelPartStateChangeType.VOLUME_SLICE, new_value: [dIdx, value] } );
      }
  }

}
