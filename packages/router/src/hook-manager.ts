/**
 *
 * NOTE: This file is still WIP and will go through at least one more iteration of refactoring, commenting and clean up!
 * In its current state, it is NOT a good source for learning about the inner workings and design of the router.
 *
 */
import { Hook } from './hook.js';
import { ComponentAppellation, IComponentAndOrViewportOrNothing } from './interfaces.js';
import { RoutingInstruction } from './routing-instruction.js';
import { Navigation } from './navigation.js';

/**
 * Public API
 */
export const enum HookTypes {
  BeforeNavigation = 'beforeNavigation',
  TransformFromUrl = 'transformFromUrl',
  TransformToUrl = 'transformToUrl',
  SetTitle = 'setTitle',
}
/**
 * Public API
 */
export type BeforeNavigationHookFunction = (routingInstructions: RoutingInstruction[], navigationInstruction: Navigation) => Promise<boolean | RoutingInstruction[]>;
/**
 * Public API
 */
export type TransformFromUrlHookFunction = (url: string, navigationInstruction: Navigation) => Promise<string | RoutingInstruction[]>;
/**
 * Public API
 */
export type TransformToUrlHookFunction = (state: string | RoutingInstruction[], navigationInstruction: Navigation) => Promise<string | RoutingInstruction[]>;
/**
 * Public API
 */
export type SetTitleHookFunction = (title: string | RoutingInstruction[], navigationInstruction: Navigation) => Promise<string | RoutingInstruction[]>;

/**
 * @internal
 */
export type HookFunction = BeforeNavigationHookFunction | TransformFromUrlHookFunction | TransformToUrlHookFunction | SetTitleHookFunction;
/**
 * @internal
 */
export type HookParameter = string | RoutingInstruction[];
/**
 * @internal
 */
export type HookResult = boolean | string | RoutingInstruction[];

export type HookTarget = ComponentAppellation | IComponentAndOrViewportOrNothing;

/**
 * Public API
 */
export type HookIdentity = number;

/**
 * Public API
 */
export interface IHookOptions {
  /**
   * What event/when to hook. Defaults to BeforeNavigation
   */
  type?: HookTypes;
  /**
   * What to hook. If omitted, everything is included
   */
  include?: HookTarget[];
  /**
   * What not to hook. If omitted, nothing is excluded
   */
  exclude?: HookTarget[];
}

/**
 * Public API
 */
export interface IHookDefinition {
  hook: HookFunction;
  options: IHookOptions;
}

/**
 * @internal - Shouldn't be used directly
 */
export class HookManager {
  public hooks: Record<HookTypes, Hook[]> = {
    beforeNavigation: [],
    transformFromUrl: [],
    transformToUrl: [],
    setTitle: [],
  };

  private lastIdentity: number = 0;

  public addHook(beforeNavigationHookFunction: BeforeNavigationHookFunction, options?: IHookOptions): HookIdentity;
  public addHook(transformFromUrlHookFunction: TransformFromUrlHookFunction, options?: IHookOptions): HookIdentity;
  public addHook(transformToUrlHookFunction: TransformToUrlHookFunction, options?: IHookOptions): HookIdentity;
  public addHook(setTitleHookFunction: SetTitleHookFunction, options?: IHookOptions): HookIdentity;
  public addHook(hookFunction: HookFunction, options?: IHookOptions): HookIdentity;
  public addHook(hookFunction: HookFunction, options?: IHookOptions): HookIdentity {
    const hook = new Hook(hookFunction, options || {}, ++this.lastIdentity);

    this.hooks[hook.type].push(hook);

    return this.lastIdentity;
  }

  public removeHook(id: HookIdentity): void {
    for (const type in this.hooks) {
      if (Object.prototype.hasOwnProperty.call(this.hooks, type)) {
        const index = this.hooks[type as HookTypes].findIndex(hook => hook.id === id);
        if (index >= 0) {
          this.hooks[type as HookTypes].splice(index, 1);
        }
      }
    }
  }

  public async invokeBeforeNavigation(routingInstructions: RoutingInstruction[], navigationInstruction: Navigation): Promise<boolean | RoutingInstruction[]> {
    return this.invoke(HookTypes.BeforeNavigation, navigationInstruction, routingInstructions) as Promise<boolean | RoutingInstruction[]>;
  }
  public async invokeTransformFromUrl(url: string, navigationInstruction: Navigation): Promise<string | RoutingInstruction[]> {
    return this.invoke(HookTypes.TransformFromUrl, navigationInstruction, url) as Promise<string | RoutingInstruction[]>;
  }
  public async invokeTransformToUrl(state: string | RoutingInstruction[], navigationInstruction: Navigation): Promise<string | RoutingInstruction[]> {
    return this.invoke(HookTypes.TransformToUrl, navigationInstruction, state) as Promise<string | RoutingInstruction[]>;
  }
  public async invokeSetTitle(title: string | RoutingInstruction[], navigationInstruction: Navigation): Promise<string | RoutingInstruction[]> {
    return this.invoke(HookTypes.SetTitle, navigationInstruction, title) as Promise<string | RoutingInstruction[]>;
  }

  public async invoke(type: HookTypes, navigationInstruction: Navigation, arg: HookParameter): Promise<HookResult> {
    for (const hook of this.hooks[type]) {
      if (!hook.wantsMatch || hook.matches(arg)) {
        const outcome = await hook.invoke(navigationInstruction, arg);
        if (typeof outcome === 'boolean') {
          if (!outcome) {
            return false;
          }
        } else {
          arg = outcome;
        }
      }
    }
    return arg;
  }
}
