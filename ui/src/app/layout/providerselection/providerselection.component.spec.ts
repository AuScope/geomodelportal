import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ProviderSelectionComponent } from './providerselection.component';

describe('ProviderSelectionComponent', () => {
  let component: ProviderSelectionComponent;
  let fixture: ComponentFixture<ProviderSelectionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [ProviderSelectionComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProviderSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
