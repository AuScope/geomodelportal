import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderCardComponent } from './providercard.component';

describe('ProviderCardComponent', () => {
    let component: ProviderCardComponent;
    let fixture: ComponentFixture<ProviderCardComponent>;

    beforeEach(
        async(() => {
            TestBed.configureTestingModule({
                declarations: [ProviderCardComponent]
            }).compileComponents();
        })
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(ProviderCardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
