import { TestBed } from '@angular/core/testing';

import { VolviewService } from './volview.service';

describe('VolviewService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: VolviewService = TestBed.inject(VolviewService);
    expect(service).toBeTruthy();
  });
});
