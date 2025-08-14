import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ModelCardComponent } from './modelcard.component';

describe('ModelCardComponent', () => {
    let component: ModelCardComponent;
    let fixture: ComponentFixture<ModelCardComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
    imports: [ModelCardComponent]
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
