export function expectFreezeEqual(a: unknown, b: unknown) {
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
}
