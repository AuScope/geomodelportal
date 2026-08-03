import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { of } from 'rxjs';
import { ModelInfoService } from './model-info.service';

describe('ModelInfoService', () => {
  let service: ModelInfoService;
  let httpClient: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule]
    });

    httpClient = TestBed.inject(HttpClient);
    spyOn(httpClient, 'get').and.callFake((url: string) => {
      if (url === './assets/geomodels/ProviderModelInfo.json') {
        return of({
          providerA: {
            name: 'Provider A',
            models: [{ modelUrlPath: 'demo-model', configFile: 'demo-config.json', modelDir: 'demo-dir' }]
          }
        });
      }
      if (url === './assets/geomodels/demo-config.json') {
        return of({ properties: { name: 'Demo Model' }, groups: {} });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    service = TestBed.runInInjectionContext(() => new ModelInfoService());
  });

  it('returns the cached model payload in the same shape on repeated lookups', async () => {
    const firstResult = await service.getModelInfo('demo-model');
    const secondResult = await service.getModelInfo('demo-model');

    expect(firstResult[0]).toEqual({ properties: { name: 'Demo Model' }, groups: {} });
    expect(firstResult[1]).toBe('demo-dir');
    expect(firstResult[2]).toBe('Provider A');
    expect(secondResult[0]).toEqual({ properties: { name: 'Demo Model' }, groups: {} });
    expect(secondResult[1]).toBe('demo-dir');
    expect(secondResult[2]).toBe('Provider A');
  });
});
