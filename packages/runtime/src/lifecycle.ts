import {
  DI,
  IContainer,
  IIndexable,
  IResolver,
  IServiceLocator,
  Registration,
  IDisposable,
} from '@aurelia/kernel';
import {
  HooksDefinition,
} from './definitions';
import {
  INode,
  INodeSequence,
  IRenderLocation,
} from './dom';
import {
  LifecycleFlags,
} from './flags';
import {
  IBatchable,
  IBindingTargetAccessor,
} from './observation';
import {
  IElementProjector,
  CustomElementDefinition,
  PartialCustomElementDefinition,
} from './resources/custom-element';
import {
  IRenderContext,
  ICompiledRenderContext,
} from './templating/render-context';
import { AuSlotContentType } from './resources/custom-elements/au-slot';
import {
  CustomAttributeDefinition,
} from './resources/custom-attribute';

import type { Scope } from './observation/binding-context';
import type { ICompositionRoot } from './aurelia';

export interface IBinding extends IDisposable {
  interceptor: this;
  readonly locator: IServiceLocator;
  readonly $scope?: Scope;
  readonly isBound: boolean;
  $bind(flags: LifecycleFlags, scope: Scope, hostScope: Scope | null): void;
  $unbind(flags: LifecycleFlags): void;
}

export const enum ViewModelKind {
  customElement,
  customAttribute,
  synthetic
}

/**
 * A controller that is ready for activation. It can be `ISyntheticView`, `ICustomElementController` or `ICustomAttributeController`.
 *
 * In terms of specificity this is identical to `IController`. The only difference is that this
 * type is further initialized and thus has more properties and APIs available.
 */
export type IHydratedController<T extends INode = INode> = ISyntheticView<T> | ICustomElementController<T> | ICustomAttributeController<T>;
/**
 * A controller that is ready for activation. It can be `ICustomElementController` or `ICustomAttributeController`.
 *
 * This type of controller is backed by a real component (hence the name) and therefore has ViewModel and may have lifecycle hooks.
 *
 * In contrast, `ISyntheticView` has neither a view model nor lifecycle hooks (but its child controllers, if any, may).
 */
export type IHydratedComponentController<T extends INode = INode> = ICustomElementController<T> | ICustomAttributeController<T>;
/**
 * A controller that is ready for activation. It can be `ISyntheticView` or `ICustomElementController`.
 *
 * This type of controller may have child controllers (hence the name) and bindings directly placed on it during hydration.
 *
 * In contrast, `ICustomAttributeController` has neither child controllers nor bindings directly placed on it (but the backing component may).
 *
 * Note: the parent of a `ISyntheticView` is always a `IHydratedComponentController` because views cannot directly own other views. Views may own components, and components may own views or components.
 */
export type IHydratedParentController<T extends INode = INode> = ISyntheticView<T> | ICustomElementController<T>;

/**
 * A callback that is invoked on each controller in the component tree.
 *
 * Return `true` to stop traversal.
 */
export type ControllerVisitor<T extends INode = INode> = (controller: IHydratedController<T>) => void | true;

/**
 * The base type for all controller types.
 *
 * Every controller, regardless of their type and state, will have at least the properties/methods in this interface.
 */
export interface IController<
  T extends INode = INode,
  C extends IViewModel<T> = IViewModel<T>,
> extends IDisposable {
  /** @internal */readonly id: number;
  readonly root: ICompositionRoot<T> | null;
  readonly flags: LifecycleFlags;
  readonly lifecycle: ILifecycle;
  readonly hooks: HooksDefinition;
  readonly vmKind: ViewModelKind;
  readonly definition: CustomElementDefinition | CustomAttributeDefinition | undefined;
}

/**
 * The base type for `ICustomAttributeController` and `ICustomElementController`.
 *
 * Both of those types have the `viewModel` and `bindingContext` properties which represent the user instance containing the bound properties and hooks for this component.
 */
export interface IComponentController<
  T extends INode = INode,
  C extends IViewModel<T> = IViewModel<T>,
> extends IController<T, C> {
  readonly vmKind: ViewModelKind.customAttribute | ViewModelKind.customElement;
  readonly definition: CustomElementDefinition | CustomAttributeDefinition;

  /**
   * The user instance containing the bound properties. This is always an instance of a class, which may either be user-defined, or generated by a view locator.
   *
   * This is the raw instance; never a proxy.
   */
  readonly viewModel: C;
  /**
   * In Proxy observation mode, this will be a proxy that wraps the view model, otherwise it is the exactly the same reference to the same object.
   *
   * This property is / should be used for creating the `Scope` and invoking lifecycle hooks.
   */
  readonly bindingContext: C & IIndexable;

}

/**
 * The base type for `ISyntheticView` and `ICustomElementController`.
 *
 * Both of those types can:
 * - Have `bindings` and `children` which are populated during rendering (hence, 'Renderable').
 * - Have physical DOM nodes that can be mounted.
 */
export interface IRenderableController<
  T extends INode = INode,
  C extends IViewModel<T> = IViewModel<T>,
> extends IController<T, C> {
  readonly vmKind: ViewModelKind.customElement | ViewModelKind.synthetic;
  readonly definition: CustomElementDefinition | undefined;

  readonly bindings: readonly IBinding[] | undefined;
  readonly children: readonly IHydratedController<T>[] | undefined;

  getTargetAccessor(propertyName: string): IBindingTargetAccessor | undefined;

  addBinding(binding: IBinding): void;
  addController(controller: IController<T>): void;
}

export const enum State {
  none                     = 0b00_0000_0000,
  activating               = 0b00_0000_0001,
  beforeBindCalled         = 0b00_0000_0010,
  activateChildrenCalled   = 0b00_0000_0100,
  activated                = 0b00_0000_1110,
  deactivating             = 0b00_0001_0000,
  beforeDetachCalled       = 0b00_0010_0000,
  deactivateChildrenCalled = 0b00_0100_0000,
  deactivated              = 0b00_1110_0000,
  released                 = 0b01_0000_0000,
  disposed                 = 0b10_0000_0000,
}

export function stringifyState(state: State): string {
  const names: string[] = [];

  if ((state & State.activating) === State.activating) {
    names.push('activating');
  }

  if ((state & State.activated) === State.activated) {
    names.push('activated');
  } else {
    if ((state & State.beforeBindCalled) === State.beforeBindCalled) {
      names.push('beforeBindCalled');
    }
    if ((state & State.activateChildrenCalled) === State.activateChildrenCalled) {
      names.push('activateChildrenCalled');
    }
  }

  if ((state & State.deactivating) === State.deactivating) {
    names.push('deactivating');
  }

  if ((state & State.deactivated) === State.deactivated) {
    names.push('deactivated');
  } else {
    if ((state & State.beforeDetachCalled) === State.beforeDetachCalled) {
      names.push('beforeDetachCalled');
    }
    if ((state & State.deactivateChildrenCalled) === State.deactivateChildrenCalled) {
      names.push('deactivateChildrenCalled');
    }
  }

  if ((state & State.released) === State.released) {
    names.push('released');
  }

  if ((state & State.disposed) === State.disposed) {
    names.push('disposed');
  }

  return names.length === 0 ? 'none' : names.join('|');
}

interface IHydratedControllerProperties<
  T extends INode = INode,
> {
  readonly state: State;
  readonly isActive: boolean;

  /** @internal */head: IHydratedController<T> | null;
  /** @internal */tail: IHydratedController<T> | null;
  /** @internal */next: IHydratedController<T> | null;

  /**
   * Return `true` to stop traversal.
   */
  accept(visitor: ControllerVisitor<T>): void | true;
}

/**
 * The controller for a synthetic view, that is, a controller created by an `IViewFactory`.
 *
 * A synthetic view, typically created when rendering a template controller (`if`, `repeat`, etc), is a renderable component with mountable DOM nodes that has no user view model.
 *
 * It has either its own synthetic binding context or is locked to some externally sourced scope (in the case of `au-compose`)
 */
export interface ISyntheticView<
  T extends INode = INode,
> extends IRenderableController<T>, IHydratedControllerProperties<T> {
  parent: IHydratedComponentController<T> | null;

  readonly vmKind: ViewModelKind.synthetic;
  readonly definition: undefined;
  readonly viewModel: undefined;
  readonly bindingContext: undefined;
  /**
   * The scope that belongs to this view. This property will always be defined when the `state` property of this view indicates that the view is currently bound.
   *
   * The `scope` may be set during `activate()` and unset during `deactivate()`, or it may be statically set during rendering with `lockScope()`.
   */
  readonly scope: Scope;
  hostScope: Scope | null;
  /**
   * The compiled render context used for rendering this view. Compilation was done by the `IViewFactory` prior to creating this view.
   */
  readonly context: ICompiledRenderContext<T>;
  readonly isStrictBinding: boolean;
  /**
   * The physical DOM nodes that will be appended during the `mount()` operation.
   */
  readonly nodes: INodeSequence<T>;
  /**
   * The DOM node that this view will be mounted to.
   */
  readonly location: IRenderLocation<T> | undefined;

  activate(
    initiator: IHydratedController<T>,
    parent: IHydratedComponentController<T>,
    flags: LifecycleFlags,
    scope: Scope,
    hostScope?: Scope | null,
  ): void | Promise<void>;
  deactivate(
    initiator: IHydratedController<T>,
    parent: IHydratedComponentController<T>,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  cancel(
    initiator: IHydratedController<T>,
    parent: IHydratedComponentController<T>,
    flags: LifecycleFlags,
  ): void;

  /**
   * Lock this view's scope to the provided `Scope`. The scope, which is normally set during `activate()`, will then not change anymore.
   *
   * This is used by `au-compose` to set the binding context of a view to a particular component instance.
   *
   * @param scope - The scope to lock this view to.
   */
  lockScope(scope: Scope): void;
  /**
   * Set the DOM node that this view will be mounted to, as well as the mounting mechanism that will be used.
   *
   * @param location - The `IRenderLocation` that this view will be mounted to.
   * @param mountStrategy - The method that will be used during mounting.
   */
  setLocation(location: IRenderLocation<T>, mountStrategy: MountStrategy): void;
  /**
   * Mark this view as not-in-use, so that it can either be disposed or returned to cache after finishing the deactivate lifecycle.
   *
   * If this view is cached and later retrieved from the cache, it will be marked as in-use again before starting the activate lifecycle, so this method must be called each time.
   *
   * If this method is *not* called before `deactivate()`, this view will neither be cached nor disposed.
   */
  release(): void;
}

export interface ICustomAttributeController<
  T extends INode = INode,
  C extends ICustomAttributeViewModel<T> = ICustomAttributeViewModel<T>,
> extends IComponentController<T, C>, IHydratedControllerProperties<T> {
  parent: IHydratedParentController<T> | null;

  readonly vmKind: ViewModelKind.customAttribute;
  readonly definition: CustomAttributeDefinition;
  /**
   * @inheritdoc
   */
  readonly viewModel: C;
  /**
   * @inheritdoc
   */
  readonly bindingContext: C & IIndexable;
  /**
   * The scope that belongs to this custom attribute. This property will always be defined when the `state` property of this view indicates that the view is currently bound.
   *
   * The `scope` will be set during `activate()` and unset during `deactivate()`.
   *
   * The scope's `bindingContext` will be the same instance as this controller's `bindingContext` property.
   */
  readonly scope: Scope;
  hostScope: Scope | null;
  readonly children: undefined;
  readonly bindings: undefined;

  activate(
    initiator: IHydratedController<T>,
    parent: IHydratedParentController<T>,
    flags: LifecycleFlags,
    scope: Scope,
    hostScope?: Scope | null,
  ): void | Promise<void>;
  deactivate(
    initiator: IHydratedController<T>,
    parent: IHydratedParentController<T>,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  cancel(
    initiator: IHydratedController<T>,
    parent: IHydratedParentController<T>,
    flags: LifecycleFlags,
  ): void;
}

/**
 * A representation of `IController` specific to a custom element whose `create` hook is about to be invoked (if present).
 *
 * It is not yet hydrated (hence 'dry') with any rendering-specific information.
 */
export interface IDryCustomElementController<
  T extends INode = INode,
  C extends IViewModel<T> = IViewModel<T>,
> extends IComponentController<T, C>, IRenderableController<T, C> {
  readonly vmKind: ViewModelKind.customElement;
  readonly definition: CustomElementDefinition;
  /**
   * The scope that belongs to this custom element. This property is set immediately after the controller is created and is always guaranteed to be available.
   *
   * It may be overwritten by end user during the `create()` hook.
   *
   * By default, the scope's `bindingContext` will be the same instance as this controller's `bindingContext` property.
   */
  scope: Scope;
  hostScope: Scope | null;
  /**
   * The physical DOM node that this controller's `nodes` will be mounted to.
   */
  host: T;
}

/**
 * A representation of `IController` specific to a custom element whose `beforeCompile` hook is about to be invoked (if present).
 *
 * It has the same properties as `IDryCustomElementController`, as well as a render context (hence 'contextual').
 */
export interface IContextualCustomElementController<
  T extends INode = INode,
  C extends IViewModel<T> = IViewModel<T>,
> extends IDryCustomElementController<T, C> {
  /**
   * The non-compiled render context used for compiling this component's `CustomElementDefinition`.
   */
  readonly context: IRenderContext<T>;
}

/**
 * A representation of `IController` specific to a custom element whose `afterCompile` hook is about to be invoked (if present).
 *
 * It has the same properties as `IContextualCustomElementController`, except the context is now compiled (hence 'compiled'), as well as the nodes, and projector.
 */
export interface ICompiledCustomElementController<
  T extends INode = INode,
  C extends IViewModel<T> = IViewModel<T>,
> extends IContextualCustomElementController<T, C>, IHydratedControllerProperties<T> {
  /**
   * The compiled render context used for hydrating this controller.
   */
  readonly context: ICompiledRenderContext<T>;
  readonly isStrictBinding: boolean;
  /**
   * The projector used for mounting the `nodes` of this controller. Typically this will be one of:
   * - `HostProjector` (the host is a normal DOM node)
   * - `ShadowDOMProjector` (the host is a shadow root)
   * - `ContainerlessProjector` (the host is a comment node)
   */
  readonly projector: IElementProjector<T>;
  /**
   * The physical DOM nodes that will be appended during the `mount()` operation.
   */
  readonly nodes: INodeSequence<T>;
}

/**
 * A fully hydrated custom element controller.
 */
export interface ICustomElementController<
  T extends INode = INode,
  C extends ICustomElementViewModel<T> = ICustomElementViewModel<T>,
> extends ICompiledCustomElementController<T, C> {
  parent: IHydratedParentController<T> | null;

  /**
   * @inheritdoc
   */
  readonly viewModel: C;
  /**
   * @inheritdoc
   */
  readonly bindingContext: C & IIndexable;

  activate(
    initiator: IHydratedController<T>,
    parent: IHydratedParentController<T> | null,
    flags: LifecycleFlags,
    scope?: Scope,
    hostScope?: Scope | null,
  ): void | Promise<void>;
  deactivate(
    initiator: IHydratedController<T>,
    parent: IHydratedParentController<T> | null,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  cancel(
    initiator: IHydratedController<T>,
    parent: IHydratedParentController<T> | null,
    flags: LifecycleFlags,
  ): void;
}

export const IController = DI.createInterface<IController>('IController').noDefault();

/**
 * Describing characteristics of a mounting operation a controller will perform
 */
export const enum MountStrategy {
  insertBefore = 1,
  append = 2,
}

export interface IViewCache<T extends INode = INode> {
  readonly isCaching: boolean;
  setCacheSize(size: number | '*', doNotOverrideIfAlreadySet: boolean): void;
  canReturnToCache(view: ISyntheticView<T>): boolean;
  tryReturnToCache(view: ISyntheticView<T>): boolean;
}

export interface IViewFactory<T extends INode = INode> extends IViewCache<T> {
  readonly name: string;
  readonly context: IRenderContext<T>;
  readonly contentType: AuSlotContentType | undefined;
  readonly projectionScope: Scope | null;
  create(flags?: LifecycleFlags): ISyntheticView<T>;
}

export const IViewFactory = DI.createInterface<IViewFactory>('IViewFactory').noDefault();

export interface IActivationHooks<TParent, T extends INode = INode> {
  beforeBind?(
    initiator: IHydratedController<T>,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  afterBind?(
    initiator: IHydratedController<T>,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  afterAttach?(
    initiator: IHydratedController<T>,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  afterAttachChildren?(
    initiator: IHydratedController<T>,
    flags: LifecycleFlags,
  ): void | Promise<void>;

  beforeDetach?(
    initiator: IHydratedController<T>,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  beforeUnbind?(
    initiator: IHydratedController<T>,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  afterUnbind?(
    initiator: IHydratedController<T>,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  afterUnbindChildren?(
    initiator: IHydratedController<T>,
    flags: LifecycleFlags,
  ): void | Promise<void>;

  onCancel?(
    initiator: IHydratedController<T>,
    parent: TParent,
    flags: LifecycleFlags,
  ): void;
  dispose?(): void;
  /**
   * If this component controls the instantiation and lifecycles of one or more controllers,
   * implement this hook to enable component tree traversal for plugins that use it (such as the router).
   *
   * Return `true` to stop traversal.
   */
  accept?(visitor: ControllerVisitor<T>): void | true;
}

export interface ICompileHooks<T extends INode = INode> {
  create?(
    controller: IDryCustomElementController<T, this>,
    parentContainer: IContainer,
    definition: CustomElementDefinition,
  ): PartialCustomElementDefinition | void;
  beforeCompile?(
    controller: IContextualCustomElementController<T, this>,
  ): void;
  afterCompile?(
    controller: ICompiledCustomElementController<T, this>,
  ): void;
  afterCompileChildren?(
    controller: ICustomElementController<T, this>,
  ): void;
}

/**
 * Defines optional lifecycle hooks that will be called only when they are implemented.
 */
export interface IViewModel<T extends INode = INode> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor: Function;
  readonly $controller?: IController<T, this>;
}

export interface ICustomElementViewModel<T extends INode = INode> extends IViewModel<T>, IActivationHooks<IHydratedParentController<T> | null, T>, ICompileHooks<T> {
  readonly $controller?: ICustomElementController<T, this>;
}

export interface ICustomAttributeViewModel<T extends INode = INode> extends IViewModel<T>, IActivationHooks<IHydratedParentController<T>, T> {
  readonly $controller?: ICustomAttributeController<T, this>;
}

export interface IHydratedCustomElementViewModel<T extends INode = INode> extends ICustomElementViewModel<T> {
  readonly $controller: ICustomElementController<T, this>;
}

export interface IHydratedCustomAttributeViewModel<T extends INode = INode> extends ICustomAttributeViewModel<T> {
  readonly $controller: ICustomAttributeController<T, this>;
}

export interface ILifecycle {
  readonly batch: IAutoProcessingQueue<IBatchable>;
}

export const ILifecycle = DI.createInterface<ILifecycle>('ILifecycle').withDefault(x => x.singleton(Lifecycle));

export interface IProcessingQueue<T> {
  add(requestor: T): void;
  process(flags: LifecycleFlags): void;
}

export interface IAutoProcessingQueue<T> extends IProcessingQueue<T> {
  readonly depth: number;
  begin(): void;
  end(flags?: LifecycleFlags): void;
  inline(fn: () => void, flags?: LifecycleFlags): void;
}

export class BatchQueue implements IAutoProcessingQueue<IBatchable> {
  public queue: IBatchable[] = [];
  public depth: number = 0;

  public constructor(
    @ILifecycle public readonly lifecycle: ILifecycle,
  ) {}

  public begin(): void {
    ++this.depth;
  }

  public end(flags?: LifecycleFlags): void {
    if (flags === void 0) {
      flags = LifecycleFlags.none;
    }
    if (--this.depth === 0) {
      this.process(flags);
    }
  }

  public inline(fn: () => void, flags?: LifecycleFlags): void {
    this.begin();
    fn();
    this.end(flags);
  }

  public add(requestor: IBatchable): void {
    this.queue.push(requestor);
  }

  public remove(requestor: IBatchable): void {
    const index = this.queue.indexOf(requestor);
    if (index > -1) {
      this.queue.splice(index, 1);
    }
  }

  public process(flags: LifecycleFlags): void {
    while (this.queue.length > 0) {
      const batch = this.queue.slice();
      this.queue = [];
      const { length } = batch;
      for (let i = 0; i < length; ++i) {
        batch[i].flushBatch(flags);
      }
    }
  }
}

export class Lifecycle implements ILifecycle {
  public readonly batch: IAutoProcessingQueue<IBatchable> = new BatchQueue(this);

  public static register(container: IContainer): IResolver<ILifecycle> {
    return Registration.singleton(ILifecycle, this).register(container);
  }
}
