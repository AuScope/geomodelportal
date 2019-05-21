import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VolumecontrolsComponent } from './volumecontrols.component';

describe('VolumecontrolsComponent', () => {
  let component: VolumecontrolsComponent;
  let fixture: ComponentFixture<VolumecontrolsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VolumecontrolsComponent ]
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
