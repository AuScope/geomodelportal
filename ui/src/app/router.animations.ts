import { animate, state, style, transition, trigger } from '@angular/animations';

export function routerTransition() {
    return slideToTop();
}

function slide(enterTransforms: [string, string], leaveTransforms: [string, string]) {
  return trigger('routerTransition', [
      state('void', style({})),
      state('*', style({})),
      transition(':enter', [
          style({ transform: enterTransforms[0] }),
          animate('0.5s ease-in-out', style({ transform: enterTransforms[1] }))
      ]),
      transition(':leave', [
          style({ transform: leaveTransforms[0] }),
          animate('0.5s ease-in-out', style({ transform: leaveTransforms[1] }))
      ])
  ]);
}

export function slideToRight() {
    return slide(['translateX(-100%)', 'translateX(0%)'], ['translateX(0%)', 'translateX(100%)']);
}

export function slideToLeft() {
    return slide(['translateX(100%)', 'translateX(0%)'], ['translateX(0%)', 'translateX(-100%)']);
}

export function slideToBottom() {
    return slide(['translateY(-100%)', 'translateY(0%)'], ['translateY(0%)', 'translateY(100%)']);
}

export function slideToTop() {
    return slide(['translateY(100%)' , 'translateY(0%)'], ['translateY(0%)', 'translateY(-100%)']);
}
