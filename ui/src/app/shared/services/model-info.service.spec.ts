import { TestBed, inject } from '@angular/core/testing';

import { ModelInfoService } from './model-info.service';

describe('ModelInfoService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ModelInfoService]
    });
  });

  it('should be created', inject([ModelInfoService], (service: ModelInfoService) => {
    expect(service).toBeTruthy();
  }));
});
