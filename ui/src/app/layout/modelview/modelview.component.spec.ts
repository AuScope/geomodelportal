import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ModelViewComponent } from './modelview.component';

describe('ModelViewComponent', () => {
  let component: ModelViewComponent;
  let fixture: ComponentFixture<ModelViewComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ModelViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModelViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
