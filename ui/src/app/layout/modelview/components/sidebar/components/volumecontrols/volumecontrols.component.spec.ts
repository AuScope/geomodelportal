import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VolumecontrolsComponent } from './volumecontrols.component';

describe('VolumecontrolsComponent', () => {
  let component: VolumecontrolsComponent;
  let fixture: ComponentFixture<VolumecontrolsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [VolumecontrolsComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VolumecontrolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
