export declare function measureExecution(): void;
export declare function attachAuditStamp(): void;
export declare function trackMetrics(): void;
export declare const globalHooks: {
    before: (typeof measureExecution)[];
    after: (typeof trackMetrics)[];
    create: {
        before: {
            use: typeof attachAuditStamp;
            description: string;
        }[];
    };
};
