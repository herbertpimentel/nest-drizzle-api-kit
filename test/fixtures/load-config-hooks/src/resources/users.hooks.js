"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userHooks = void 0;
exports.normalizeUserInput = normalizeUserInput;
exports.publishCreatedEvent = publishCreatedEvent;
function normalizeUserInput() { }
function publishCreatedEvent() { }
exports.userHooks = {
    create: {
        before: [
            {
                use: normalizeUserInput,
                description: 'Normalize the create payload before persisting it.',
            },
        ],
        after: [publishCreatedEvent],
    },
};
