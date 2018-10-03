import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelCardComponent } from './modelcard.component';

describe('ModelCardComponent', () => {
    let component: ModelCardComponent;
    let fixture: ComponentFixture<ModelCardComponent>;

    beforeEach(
        async(() => {
            TestBed.configureTestingModule({
                declarations: [ModelCardComponent]
            }).compileComponents();
        })
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(ModelCardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
