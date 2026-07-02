// this file defines the types used for documentation generation in the project

// this interface represents a symbol in the documentation, such as a function, class, type, interface, or constant
export interface DocSymbol {
    file: string;
    name: string;
    kind: "function" | "class" | "type" | "interface" | "const";
    signature?: string;
    jsdoc?: string;
}

// this interface represents a module in the documentation, which contains a path and an array of symbols
export interface DocModule {
    path: string;
    symbols: DocSymbol[];
}
