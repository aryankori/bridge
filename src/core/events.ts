/**
 * Bridge Event Bus
 *
 * A typed, synchronous event bus for internal Bridge communication.
 * All agent-related state changes flow through this bus.
 *
 * Design decision: Synchronous listeners with async-safe emission.
 * Bridge events are internal coordination signals, not high-throughput
 * data streams. Simplicity wins over maximum throughput here.
 */

import type { BridgeEvent, BridgeEventMap, BridgeEventType } from './types.js';

type EventListener<T extends BridgeEventType> = (event: BridgeEvent<T>) => void;

export class EventBus {
 private listeners = new Map<BridgeEventType, Set<EventListener<BridgeEventType>>>();

 /**
 * Subscribe to a specific event type.
 * Returns an unsubscribe function.
 */
 on<T extends BridgeEventType>(type: T, listener: EventListener<T>): () => void {
 let set = this.listeners.get(type);
 if (!set) {
 set = new Set();
 this.listeners.set(type, set);
 }
 const typedListener = listener as EventListener<BridgeEventType>;
 set.add(typedListener);

 return () => {
 set?.delete(typedListener);
 if (set?.size === 0) {
 this.listeners.delete(type);
 }
 };
 }

 /**
 * Subscribe to a specific event type for a single emission.
 */
 once<T extends BridgeEventType>(type: T, listener: EventListener<T>): () => void {
 const unsubscribe = this.on(type, (event) => {
 unsubscribe();
 listener(event);
 });
 return unsubscribe;
 }

 /**
 * Emit an event to all registered listeners.
 */
 emit<T extends BridgeEventType>(type: T, payload: BridgeEventMap[T]): void {
 const event: BridgeEvent<T> = {
 type,
 payload,
 timestamp: new Date(),
 };

 const set = this.listeners.get(type);
 if (!set) return;

 for (const listener of set) {
 try {
 (listener as EventListener<T>)(event);
 } catch (err) {
 console.error(`[Bridge EventBus] Listener error for ${type}:`, err);
 }
 }
 }

 /**
 * Remove all listeners for a specific event type, or all listeners entirely.
 */
 clear(type?: BridgeEventType): void {
 if (type) {
 this.listeners.delete(type);
 } else {
 this.listeners.clear();
 }
 }

 /**
 * Get the count of listeners for a specific event type.
 */
 listenerCount(type: BridgeEventType): number {
 return this.listeners.get(type)?.size ?? 0;
 }
}
