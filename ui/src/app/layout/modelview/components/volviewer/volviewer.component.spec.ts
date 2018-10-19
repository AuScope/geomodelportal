import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VolviewerComponent } from './volviewer.component';

describe('VolviewerComponent', () => {
  let component: VolviewerComponent;
  let fixture: ComponentFixture<VolviewerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VolviewerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VolviewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
