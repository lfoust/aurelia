import { ILifecycle } from '../lifecycle';
import { CollectionKind, ICollectionObserver, IObservedArray } from '../observation';
export declare const nativePush: (...items: any[]) => number;
export declare const nativeUnshift: (...items: any[]) => number;
export declare const nativePop: () => any;
export declare const nativeShift: () => any;
export declare const nativeSplice: {
    (start: number, deleteCount?: number): any[];
    (start: number, deleteCount: number, ...items: any[]): any[];
};
export declare const nativeReverse: () => any[];
export declare const nativeSort: (compareFn?: (a: any, b: any) => number) => any[];
export declare function enableArrayObservation(): void;
export declare function disableArrayObservation(): void;
export interface ArrayObserver extends ICollectionObserver<CollectionKind.array> {
}
export declare class ArrayObserver implements ArrayObserver {
    resetIndexMap: () => void;
    collection: IObservedArray;
    constructor(lifecycle: ILifecycle, array: IObservedArray);
}
export declare function getArrayObserver(lifecycle: ILifecycle, array: IObservedArray): ArrayObserver;
//# sourceMappingURL=array-observer.d.ts.map