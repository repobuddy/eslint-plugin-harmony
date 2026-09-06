/**
 * Disable @typescript-eslint/no-empty-interface, and its typescript-eslint v8
 * replacement @typescript-eslint/no-empty-object-type.
 * It is useful to have empty interfaces.
 * They provides a contextual meaning to the interface,
 * and allow extensibility in the future without breaking changes.
 *
 * It is needed for open/closed principles
 */


export interface Bar {}

export interface Foo extends Bar {}
