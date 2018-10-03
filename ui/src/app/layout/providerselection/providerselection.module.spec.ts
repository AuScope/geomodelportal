import { ProviderSelectionModule } from './providerselection.module';

describe('ProviderSelectionModule', () => {
  let providerSelectionModule: ProviderSelectionModule;

  beforeEach(() => {
    providerSelectionModule = new ProviderSelectionModule();
  });

  it('should create an instance', () => {
    expect(providerSelectionModule).toBeTruthy();
  });
});
