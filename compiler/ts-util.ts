import * as ts from 'typescript';
import { bindingMode } from './interfaces';
import { hyphenate } from './util';

function resolveBindingMode(mode: string): bindingMode {
  switch (mode) {
    case 'oneTime': return bindingMode.oneTime;
    case 'toView': case 'oneTway': return bindingMode.toView;
    case 'twoWay': return bindingMode.twoWay;
    case 'fromView': return bindingMode.fromView;
  }
  return undefined;
}

export function getObjectPropertyValue(obj: ts.ObjectLiteralExpression, name: string): ts.Expression {
  let properties = obj.properties;
  if (!properties || !properties.length) {
    return undefined;
  }
  for (let i = 0, ii = properties.length; ii > i; ++i) {
    let prop = properties[i];
    if (!ts.isPropertyAssignment(prop)) {
      continue;
    }
    let propName = prop.name;
    if (ts.isIdentifier(propName) && propName.escapedText.toString() === name) {
      return prop.initializer;
    }
  }
  return undefined;
}

export function getBindableDecoratorBindingMode(dec: ts.Decorator) {
  let expression = dec.expression;
  // @bindable
  if (!ts.isCallExpression(expression)) {
    return undefined;
  }
  // @bindable()
  let args = expression.arguments;
  if (!args || !args.length) {
    return undefined;
  }
  if (args.length > 1) {
    // @bindable(arg1, ...)
    console.log('@bindable() used with more than 1 parameter.');
  }
  // @bindable({ ... })
  let config = expression.arguments[0];
  // @bindable('...')
  if (!ts.isObjectLiteralExpression(config)) {
    return undefined;
  }
  let propValue = getObjectPropertyValue(config, 'defaultBindingMode');
  if (!propValue) {
    // @bindable({ no defaultBindingMode specified object })
    return undefined;
  }
  if (!ts.isPropertyAccessExpression(propValue)) {
    return undefined;
  }
  expression = propValue.expression;
  if (!ts.isIdentifier(expression)) {
    // { defaultBindingMode: (() => {})() } : too complex
    // TODO: consider support craziness
    return undefined;
  }
  let accessedObjName = expression.escapedText.toString();
  if (accessedObjName !== 'bindingMode') {
    // bindingMode.* support only
    // TODO: consider support renamed import
    return undefined;
  }
  // { defaultBindingMode: bindingMode.(mode) }
  let mode = propValue.name.escapedText.toString();
  return resolveBindingMode(mode);
}

export function getBindableMode(classMember: ts.ClassElement) {
  if (!ts.isPropertyDeclaration(classMember)) {
    return undefined;
  }
  let bindableDecorator = getBindableDecorator(classMember);
  if (!bindableDecorator) {
    return undefined;
  }
  return getBindableDecoratorBindingMode(bindableDecorator);
}

export function hasBindableDecorator(member: ts.ClassElement): member is ts.PropertyDeclaration {
  if (!ts.isPropertyDeclaration(member)) {
    return false;
  }
  if (!member.decorators) {
    return false;
  }
  return member.decorators.some(decorator => (decorator.expression as ts.Identifier).text === 'bindable');
}

export function getBindableDecorator(prop: ts.PropertyDeclaration): ts.Decorator {
  if (!prop.decorators) {
    return null;
  }
  return prop.decorators.find(dec => {
    let expression = dec.expression;
    if (ts.isCallExpression(expression)) {
      let innerExpression = expression.expression;
      return ts.isIdentifier(innerExpression) && innerExpression.escapedText.toString() === 'bindable';
    } else if (ts.isIdentifier(dec.expression)) {
      return dec.expression.escapedText.toString() === 'bindable';
    }
    return false;
  }) || null;
}

export function normalizeElementClassName(name: ts.ClassDeclaration | ts.Identifier | string) {
  name = typeof name === 'string' ? name : (ts.isClassDeclaration(name) ? name.name : name).escapedText.toString();
  return name.replace(/CustomElement$/, '');
}

export function getElementHtmlName(name: ts.ClassDeclaration | ts.Identifier | string): string {
  return hyphenate(normalizeElementClassName(name));
}

export function getAttributeHtmlName(name: ts.Identifier | string): string {
  name = typeof name === 'string' ? name : name.escapedText.toString();
  return hyphenate(name.replace(/CustomAttribute$/, ''));
}

export function getElementViewName(name: ts.ClassDeclaration | ts.Identifier | string): string {
  return `$${normalizeElementClassName(name)}View`
}

export function getPrivateClassName(name: ts.ClassDeclaration | ts.Identifier | string): string {
  return `$${
    typeof name === 'string'
      ? name
      : ts.isIdentifier(name)
        ? name.escapedText.toString()
        : name.name.escapedText.toString()
    }`;
}

export function removeExport(modifiers: ts.NodeArray<ts.Modifier>): ts.NodeArray<ts.Modifier> {
  if (!modifiers) {
    return modifiers;
  }
  let idx = modifiers.findIndex(m => m.kind === ts.SyntaxKind.ExportKeyword);
  if (idx !== -1) {
    let mods = [...modifiers];
    mods.splice(idx, 1);
    return mods as any;
  }
  return modifiers;
}
