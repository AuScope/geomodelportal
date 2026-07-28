import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(waitForAsync(() => {
    const routerEvents = new Subject<any>();
    const routerStub = {
      events: routerEvents.asObservable(),
      url: '/model/test-model',
      getCurrentNavigation: jasmine.createSpy('getCurrentNavigation').and.returnValue({
        extras: {
          state: { fromProvider: true }
        }
      }),
      navigate: jasmine.createSpy('navigate')
    } as unknown as Router;

    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [{ provide: Router, useValue: routerStub }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set provider when the current navigation came from a provider route', () => {
    component.detectProvider();

    expect(component.provider).toBe('provider');
  });

  it('should navigate home to the root route', () => {
    component.navigateToHome();

    expect(component.router.navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
  });

  it('should navigate to the selected provider model-selection route', () => {
    component.providerPath = 'sandstone';

    component.navigateToToModelSelection();

    expect(component.router.navigate).toHaveBeenCalledWith(['/provider', 'sandstone'], { replaceUrl: true });
  });
});
