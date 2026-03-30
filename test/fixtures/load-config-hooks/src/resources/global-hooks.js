"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalHooks = void 0;
exports.measureExecution = measureExecution;
exports.attachAuditStamp = attachAuditStamp;
exports.trackMetrics = trackMetrics;
function measureExecution() { }
function attachAuditStamp() { }
function trackMetrics() { }
exports.globalHooks = {
    before: [measureExecution],
    after: [trackMetrics],
    create: {
        before: [
            {
                use: attachAuditStamp,
                description: 'Attach audit metadata to the validated create input.',
            },
        ],
    },
};
