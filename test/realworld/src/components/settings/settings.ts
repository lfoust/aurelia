import { inject } from '@aurelia/kernel';
import { IRouter, lifecycleLogger } from '@aurelia/router';

import { UserService } from 'shared/services/user-service';
import { SharedState } from 'shared/state/shared-state';

@lifecycleLogger('settings')
@inject(UserService, SharedState, IRouter)
export class Settings {
  public constructor(
    private readonly userService: UserService,
    private readonly sharedState: SharedState,
    private readonly router: IRouter,
  ) {}

  public define() { return; }
  public hydrating() { return; }
  public hydrated() { return; }
  public created() { return; }

  public binding() { return; }
  public bound() { return; }
  public afterAttach() { return; }
  public afterAttachChildren() { return; }

  public beforeDetach() { return; }
  public beforeUnbind() { return; }

  public update() {
    this.userService.update(this.sharedState.currentUser);
  }

  public logout() {
    this.userService.purgeAuth();
    this.router.goto('home').catch((error: Error) => { throw error; });
  }
}
