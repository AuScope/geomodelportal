import { ProviderCardModule } from './providercard.module';

describe('ProviderCardModule', () => {
    let providerCardModule: ProviderCardModule;

    beforeEach(() => {
        providerCardModule = new ProviderCardModule();
    });

    it('should create an instance', () => {
        expect(providerCardModule).toBeTruthy();
    });
});
