import { ModelSelectionModule } from './modelselection.module';

describe('ModelSelectionModule', () => {
  let modelselectionModule: ModelSelectionModule;

  beforeEach(() => {
    modelselectionModule = new ModelSelectionModule();
  });

  it('should create an instance', () => {
    expect(modelselectionModule).toBeTruthy();
  });
});
