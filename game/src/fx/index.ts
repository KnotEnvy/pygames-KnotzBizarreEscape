import type { RegisterContext } from '../core';
import { FxDirector } from './director';
import { installGallery } from './gallery';

export function registerFx(ctx: RegisterContext): void {
    const director = new FxDirector(ctx);
    if (new URLSearchParams(location.search).has('fxtest')) installGallery(ctx, director);
}
