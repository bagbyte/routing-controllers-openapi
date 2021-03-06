"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
require("reflect-metadata");
const index_1 = require("./index");
const OPEN_API_KEY = Symbol('routing-controllers-openapi:OpenAPI');
function OpenAPI(spec) {
    return (...args) => {
        if (args.length === 1) {
            const [target] = args;
            const currentMeta = getOpenAPIMetadata(target);
            setOpenAPIMetadata([spec, ...currentMeta], target);
        }
        else {
            const [target, key] = args;
            const currentMeta = getOpenAPIMetadata(target, key);
            setOpenAPIMetadata([spec, ...currentMeta], target, key);
        }
    };
}
exports.OpenAPI = OpenAPI;
function applyOpenAPIDecorator(originalOperation, route) {
    const { action } = route;
    const openAPIParams = [
        ...getOpenAPIMetadata(action.target),
        ...getOpenAPIMetadata(action.target.prototype, action.method)
    ];
    return openAPIParams.reduce((acc, oaParam) => {
        return _.isFunction(oaParam)
            ? oaParam(acc, route)
            : _.merge({}, acc, oaParam);
    }, originalOperation);
}
exports.applyOpenAPIDecorator = applyOpenAPIDecorator;
function getOpenAPIMetadata(target, key) {
    return ((key
        ? Reflect.getMetadata(OPEN_API_KEY, target.constructor, key)
        : Reflect.getMetadata(OPEN_API_KEY, target)) || []);
}
exports.getOpenAPIMetadata = getOpenAPIMetadata;
function setOpenAPIMetadata(value, target, key) {
    return key
        ? Reflect.defineMetadata(OPEN_API_KEY, value, target.constructor, key)
        : Reflect.defineMetadata(OPEN_API_KEY, value, target);
}
exports.setOpenAPIMetadata = setOpenAPIMetadata;
function ResponseSchema(responseClass, options = {}) {
    const setResponseSchema = (source, route) => {
        const contentType = options.contentType || index_1.getContentType(route);
        const description = options.description || '';
        const isArray = options.isArray || false;
        const statusCode = (options.statusCode || index_1.getStatusCode(route)) + '';
        let responseSchemaName = '';
        if (typeof responseClass === 'function' && responseClass.name) {
            responseSchemaName = responseClass.name;
        }
        else if (typeof responseClass === 'string') {
            responseSchemaName = responseClass;
        }
        if (responseSchemaName) {
            const reference = {
                $ref: `#/components/schemas/${responseSchemaName}`
            };
            const schema = isArray
                ? { items: reference, type: 'array' }
                : reference;
            const responses = {
                [statusCode]: {
                    content: {
                        [contentType]: {
                            schema
                        }
                    },
                    description
                }
            };
            return _.merge({}, source, { responses });
        }
        return source;
    };
    return OpenAPI(setResponseSchema);
}
exports.ResponseSchema = ResponseSchema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9kZWNvcmF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNEJBQTJCO0FBTzNCLDRCQUF5QjtBQUV6QixtQ0FBK0Q7QUFFL0QsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLHFDQUFxQyxDQUFDLENBQUE7QUFlbEUsU0FBZ0IsT0FBTyxDQUFDLElBQWtCO0lBRXhDLE9BQU8sQ0FBQyxHQUFHLElBQXVELEVBQUUsRUFBRTtRQUNwRSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUE7WUFDckIsTUFBTSxXQUFXLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDOUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxXQUFXLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtTQUNuRDthQUFNO1lBQ0wsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUE7WUFDMUIsTUFBTSxXQUFXLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ25ELGtCQUFrQixDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1NBQ3hEO0lBQ0gsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQWJELDBCQWFDO0FBS0QsU0FBZ0IscUJBQXFCLENBQ25DLGlCQUFrQyxFQUNsQyxLQUFhO0lBRWIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQTtJQUN4QixNQUFNLGFBQWEsR0FBRztRQUNwQixHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDcEMsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxN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