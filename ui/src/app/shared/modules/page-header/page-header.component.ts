import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-page-header',
    templateUrl: './page-header.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterLink]
})
export class PageHeaderComponent {
    @Input() heading: string;
    @Input() icon: string;
}
