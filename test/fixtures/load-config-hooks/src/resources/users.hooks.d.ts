export declare function normalizeUserInput(): void;
export declare function publishCreatedEvent(): void;
export declare const userHooks: {
    create: {
        before: {
            use: typeof normalizeUserInput;
            description: string;
        }[];
        after: (typeof publishCreatedEvent)[];
    };
};
