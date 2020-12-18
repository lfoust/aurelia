import { InstructionParameters } from './instruction-parameters';
import { InstructionViewport } from './instruction-viewport';
import { InstructionComponent } from './instruction-component';
import { ComponentAppellation, ComponentParameters, ViewportHandle } from './interfaces.js';
import { Scope, IScopeOwner } from './scope.js';
import { ViewportScope } from './viewport-scope.js';
import { FoundRoute } from './found-route.js';

/**
 * The routing instructions are the core of the router's navigations. All
 * navigation instructions to the router are translated to a set of
 * routing instructions. The routing instructions are most often resolved
 * both lazily and late to support dynamic, local resolutions.
 *
 */
export class RoutingInstruction {
  /**
   * The component part of the routing instruction.
   */
  public component: InstructionComponent;
  /**
   * The viewport part of the routing instruction.
   */
  public viewport: InstructionViewport;
  /**
   * The parameters part of the routing instruction.
   */
  public parameters: InstructionParameters;

  /**
   * Whether the routing instruction owns its scope.
   */
  public ownsScope: boolean = true;
  /**
   * The routing instructions in the next scope ("children").
   */
  public nextScopeInstructions: RoutingInstruction[] | null = null;

  /**
   * The scope the the routing instruction belongs to.
   */
  public scope: Scope | null = null;
  /**
   * The context of the routing instruction.
   */
  public context: string = '';
  /**
   * The viewport scope part of the routing instruction.
   */
  public viewportScope: ViewportScope | null = null; // TODO: Add InstructionViewportScope
  /**
   * Whether the routing instruction can be resolved within the scope without having
   * viewport specified. Used when creating string instructions/links/url.
   */
  public needsViewportDescribed: boolean = false;
  /**
   * The configured route, if any, that the routing instruction is part of.
   */
  public route: FoundRoute | string | null = null;

  /**
   * Whether the routing instruction is the result of a viewport default (meaning it has
   * lower priority when finding viewports).
   */
  public default: boolean = false;

  /**
   * Whether the routing instruction is the top instruction in its routing instruction
   * hierarchy.
   */
  public topInstruction: boolean = false;

  public constructor(
    component?: ComponentAppellation,
    viewport?: ViewportHandle,
    parameters?: ComponentParameters,
  ) {
    this.component = InstructionComponent.create(component);
    this.viewport = InstructionViewport.create(viewport);
    this.parameters = InstructionParameters.create(parameters);
  }

  public static create(component?: ComponentAppellation | Promise<ComponentAppellation>, viewport?: ViewportHandle, parameters?: ComponentParameters, ownsScope: boolean = true, nextScopeInstructions: RoutingInstruction[] | null = null): RoutingInstruction {
    // if (component instanceof Promise) {
    //   return component.then((resolvedComponent) => {
    //     return RoutingInstruction.create(instructionResolver, resolvedComponent, viewport, parameters, ownsScope, nextScopeInstructions);
    //   });
    // }

    const instruction: RoutingInstruction = new RoutingInstruction(component, viewport, parameters);
    instruction.ownsScope = ownsScope;
    instruction.nextScopeInstructions = nextScopeInstructions;

    return instruction;
  }

  /**
   * The endpoint of the routing instruction.
   */
  public get endpoint(): IScopeOwner | null {
    return this.viewport?.instance ?? this.viewportScope ?? null;
  }

  public get owner(): IScopeOwner | null {
    return this.viewport?.instance ?? this.viewportScope ?? null;
  }

  /**
   * Compare the routing instruction's component with the component of another routing
   * instruction. Compares on name unless `compareType` is `true`.
   *
   * @param other - The routing instruction to compare to
   * @param compareParameters - Whether parameters should also be compared
   * @param compareType - Whether comparision should be made on type only (and not name)
   */
  public sameComponent(other: RoutingInstruction, compareParameters: boolean = false, compareType: boolean = false): boolean {
    if (compareParameters && !this.sameParameters(other, compareType)) {
      return false;
    }
    return this.component.same(other.component, compareType);
  }

  /**
   * Compare the routing instruction's viewport with the viewport of another routing
   * instruction. Compares on viewport instance if possible, otherwise name.
   *
   * @param other - The routing instruction to compare to
   */
  public sameViewport(other: RoutingInstruction): boolean {
    return this.viewport.same(other.viewport);
  }

  // TODO: Somewhere we need to check for format such as spaces etc
  /**
   * Compare the routing instruction's parameters with the parameters of another routing
   * instruction. Compares on actual values.
   *
   * @param other - The routing instruction to compare to
   * @param compareType - Whether comparision should be made on type as well
   */
  public sameParameters(other: RoutingInstruction, compareType: boolean = false): boolean {
    if (!this.component.same(other.component, compareType)) {
      return false;
    }
    return this.parameters.same(other.parameters, this.component.type);
  }
}
