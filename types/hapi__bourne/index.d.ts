declare module '@hapi/bourne' {
    export const parse: <T>(text: string, ...args: any[]) => T;

    export const scan: <T>(obj: T, options: { protoAction?: 'remove' }) => T;

    export const safeParse: (text: string, reviver: any) => any;
}
