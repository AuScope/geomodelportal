import { ModelCardModule } from './modelcard.module';

describe('ModelCardModule', () => {
    let modelCardModule: ModelCardModule;

    beforeEach(() => {
        modelCardModule = new ModelCardModule();
    });

    it('should create an instance', () => {
        expect(modelCardModule).toBeTruthy();
    });
});
