import { TestBed, inject } from '@angular/core/testing';

import { HelpinfoService } from './helpinfo.service';

describe('HelpinfoService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HelpinfoService]
    });
  });

  it('should be created', inject([HelpinfoService], (service: HelpinfoService) => {
    expect(service).toBeTruthy();
  }));
});
