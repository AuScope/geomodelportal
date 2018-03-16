import { ModelViewModule } from './modelview.module';

describe('ModelViewModule', () => {
  let modelViewModule: ModelViewModule;

  beforeEach(() => {
    modelViewModule = new ModelViewModule();
  });

  it('should create an instance', () => {
    expect(modelViewModule).toBeTruthy();
  });
});
