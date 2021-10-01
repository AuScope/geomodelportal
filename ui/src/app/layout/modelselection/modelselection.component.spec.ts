import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ModelSelectionComponent } from './modelselection.component';

describe('ModelSelectionComponent', () => {
  let component: ModelSelectionComponent;
  let fixture: ComponentFixture<ModelSelectionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ModelSelectionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModelSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
