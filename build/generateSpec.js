"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const pathToRegexp = require("path-to-regexp");
require("reflect-metadata");
const decorators_1 = require("./decorators");
function getFullExpressPath(route) {
    const { action, controller, options } = route;
    return ((options.routePrefix || '') +
        (controller.route || '') +
        (action.route || ''));
}
exports.getFullExpressPath = getFullExpressPath;
function getFullPath(route) {
    return expressToOpenAPIPath(getFullExpressPath(route));
}
exports.getFullPath = getFullPath;
function getOperation(route) {
    const operation = {
        operationId: getOperationId(route),
        parameters: [
            ...getHeaderParams(route),
            ...getPathParams(route),
            ...getQueryParams(route)
        ],
        requestBody: getRequestBody(route) || undefined,
        responses: getResponses(route),
        summary: getSummary(route),
        tags: getTags(route)
    };
    const cleanedOperation = _.omitBy(operation, _.isEmpty);
    return decorators_1.applyOpenAPIDecorator(cleanedOperation, route);
}
exports.getOperation = getOperation;
function getOperationId(route) {
    return `${route.action.target.name}.${route.action.method}`;
}
exports.getOperationId = getOperationId;
function getPaths(routes) {
    const routePaths = routes.map(route => ({
        [getFullPath(route)]: {
            [route.action.type]: getOperation(route)
        }
    }));
    return _.merge(...routePaths);
}
exports.getPaths = getPaths;
function getHeaderParams(route) {
    const headers = _(route.params)
        .filter({ type: 'header' })
        .map(headerMeta => {
        const schema = getParamSchema(headerMeta);
        return {
            in: 'header',
            name: headerMeta.name || '',
            required: isRequired(headerMeta, route),
            schema
        };
    })
        .value();
    const headersMeta = _.find(route.params, { type: 'headers' });
    if (headersMeta) {
        const schema = getParamSchema(headersMeta);
        headers.push({
            in: 'header',
            name: _.last(_.split(schema.$ref, '/')) || '',
            required: isRequired(headersMeta, route),
            schema
        });
    }
    return headers;
}
exports.getHeaderParams = getHeaderParams;
function getPathParams(route) {
    const path = getFullExpressPath(route);
    const tokens = pathToRegexp.parse(path);
    return tokens
        .filter(_.isObject)
        .map((token) => {
        const name = token.name + '';
        const param = {
            in: 'path',
            name,
            required: !token.optional,
            schema: { type: 'string' }
        };
        if (token.pattern && token.pattern !== '[^\\/]+?') {
            param.schema = { pattern: token.pattern, type: 'string' };
        }
        const meta = _.find(route.params, { name, type: 'param' });
        if (meta) {
            const metaSchema = getParamSchema(meta);
            param.schema =
                'type' in metaSchema ? Object.assign(Object.assign({}, param.schema), metaSchema) : metaSchema;
        }
        return param;
    });
}
exports.getPathParams = getPathParams;
function getQueryParams(route) {
    const queries = _(route.params)
        .filter({ type: 'query' })
        .map(queryMeta => {
        const schema = getParamSchema(queryMeta);
        return {
            in: 'query',
            name: queryMeta.name || '',
            required: isRequired(queryMeta, route),
            schema
        };
    })
        .value();
    const queriesMeta = _.find(route.params, { type: 'queries' });
    if (queriesMeta) {
        const schema = getParamSchema(queriesMeta);
        queries.push({
            in: 'query',
            name: _.last(_.split(schema.$ref, '/')) || '',
            required: isRequired(queriesMeta, route),
            schema
        });
    }
    return queries;
}
exports.getQueryParams = getQueryParams;
function getRequestBody(route) {
    const bodyParamMetas = route.params.filter(d => d.type === 'body-param');
    const bodyParamsSchema = bodyParamMetas.length > 0
        ? bodyParamMetas.reduce((acc, d) => (Object.assign(Object.assign({}, acc), { properties: Object.assign(Object.assign({}, acc.properties), { [d.name]: getParamSchema(d) }), required: isRequired(d, route)
                ? [...(acc.required || []), d.name]
                : acc.required })), { properties: {}, required: [], type: 'object' })
        : null;
    const bodyMeta = route.params.find(d => d.type === 'body');
    if (bodyMeta) {
        const bodySchema = getParamSchema(bodyMeta);
        const { $ref } = 'items' in bodySchema && bodySchema.items ? bodySchema.items : bodySchema;
        return {
            content: {
                'application/json': {
                    schema: bodyParamsSchema
                        ? { allOf: [bodySchema, bodyParamsSchema] }
                        : bodySchema
                }
            },
            description: _.last(_.split($ref, '/')),
            required: isRequired(bodyMeta, route)
        };
    }
    else if (bodyParamsSchema) {
        return {
            content: { 'application/json': { schema: bodyParamsSchema } }
        };
    }
}
exports.getRequestBody = getRequestBody;
function getContentType(route) {
    const defaultContentType = route.controller.type === 'json'
        ? 'application/json'
        : 'text/html; charset=utf-8';
    const contentMeta = _.find(route.responseHandlers, { type: 'content-type' });
    return contentMeta ? contentMeta.value : defaultContentType;
}
exports.getContentType = getContentType;
function getStatusCode(route) {
    const successMeta = _.find(route.responseHandlers, { type: 'success-code' });
    return successMeta ? successMeta.value + '' : '200';
}
exports.getStatusCode = getStatusCode;
function getResponses(route) {
    const contentType = getContentType(route);
    const successStatus = getStatusCode(route);
    return {
        [successStatus]: {
            content: { [contentType]: {} },
            description: 'Successful response'
        }
    };
}
exports.getResponses = getResponses;
function getSpec(routes) {
    return {
        components: { schemas: {} },
        info: { title: '', version: '1.0.0' },
        openapi: '3.0.0',
        paths: getPaths(routes)
    };
}
exports.getSpec = getSpec;
function getSummary(route) {
    return _.capitalize(_.startCase(route.action.method));
}
exports.getSummary = getSummary;
function getTags(route) {
    return [_.startCase(route.controller.target.name.replace(/Controller$/, ''))];
}
exports.getTags = getTags;
function expressToOpenAPIPath(expressPath) {
    const tokens = pathToRegexp.parse(expressPath);
    return tokens
        .map(d => (_.isString(d) ? d : `${d.prefix}{${d.name}}`))
        .join('');
}
exports.expressToOpenAPIPath = expressToOpenAPIPath;
function isRequired(meta, route) {
    const globalRequired = _.get(route.options, 'defaults.paramOptions.required');
    return globalRequired ? meta.required !== false : !!meta.required;
}
function getParamSchema(param) {
    const { explicitType, index, object, method } = param;
    const type = Reflect.getMetadata('design:paramtypes', object, method)[index];
    if (_.isFunction(type) && type.name === 'Array') {
        const items = explicitType
            ? { $ref: '#/components/schemas/' + explicitType.name }
            : { type: 'object' };
        return { items, type: 'array' };
    }
    if (explicitType) {
        return { $ref: '#/components/schemas/' + explicitType.name };
    }
    if (_.isFunction(type)) {
        if (_.isString(type.prototype) || _.isSymbol(type.prototype)) {
            return { type: 'string' };
        }
        else if (_.isNumber(type.prototype)) {
            return { type: 'number' };
        }
        else if (_.isBoolean(type.prototype)) {
            return { type: 'boolean' };
        }
        else if (type.name !== 'Object') {
            return { $ref: '#/components/schemas/' + type.name };
        }
    }
    return {};
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVTcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2dlbmVyYXRlU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLDRCQUEyQjtBQUUzQiwrQ0FBOEM7QUFDOUMsNEJBQXlCO0FBR3pCLDZDQUFvRDtBQUlwRCxTQUFnQixrQkFBa0IsQ0FBQyxLQUFhO0lBQzlDLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxHQUFHLEtBQUssQ0FBQTtJQUM3QyxPQUFPLENBQ0wsQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQztRQUMzQixDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3hCLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FDckIsQ0FBQTtBQUNILENBQUM7QUFQRCxnREFPQztBQUtELFNBQWdCLFdBQVcsQ0FBQyxLQUFhO0lBQ3ZDLE9BQU8sb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtBQUN4RCxDQUFDO0FBRkQsa0NBRUM7QUFLRCxTQUFnQixZQUFZLENBQUMsS0FBYTtJQUN4QyxNQUFNLFNBQVMsR0FBdUI7UUFDcEMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUM7UUFDbEMsVUFBVSxFQUFFO1lBQ1YsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDO1lBQ3pCLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQztZQUN2QixHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUM7U0FDekI7UUFDRCxXQUFXLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLFNBQVM7UUFDL0MsU0FBUyxFQUFFLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFDOUIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDMUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUM7S0FDckIsQ0FBQTtJQUVELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBdUIsQ0FBQTtJQUM3RSxPQUFPLGtDQUFxQixDQUFDLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ3ZELENBQUM7QUFoQkQsb0NBZ0JDO0FBS0QsU0FBZ0IsY0FBYyxDQUFDLEtBQWE7SUFDMUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFBO0FBQzdELENBQUM7QUFGRCx3Q0FFQztBQUtELFNBQWdCLFFBQVEsQ0FBQyxNQUFnQjtJQUN2QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0QyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO1lBQ3BCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLENBQUMsS0FBSyxDQUFDO1NBQ3pDO0tBQ0YsQ0FBQyxDQUFDLENBQUE7SUFHSCxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQTtBQUMvQixDQUFDO0FBVEQsNEJBU0M7QUFLRCxTQUFnQixlQUFlLENBQUMsS0FBYTtJQUMzQyxNQUFNLE9BQU8sR0FBeUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7U0FDbEQsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO1NBQzFCLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUNoQixNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFvQixDQUFBO1FBQzVELE9BQU87WUFDTCxFQUFFLEVBQUUsUUFBZ0M7WUFDcEMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLElBQUksRUFBRTtZQUMzQixRQUFRLEVBQUUsVUFBVSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUM7WUFDdkMsTUFBTTtTQUNQLENBQUE7SUFDSCxDQUFDLENBQUM7U0FDRCxLQUFLLEVBQUUsQ0FBQTtJQUVWLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO0lBQzdELElBQUksV0FBVyxFQUFFO1FBQ2YsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBdUIsQ0FBQTtRQUNoRSxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ1gsRUFBRSxFQUFFLFFBQVE7WUFDWixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFO1lBQzdDLFFBQVEsRUFBRSxVQUFVLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQztZQUN4QyxNQUFNO1NBQ1AsQ0FBQyxDQUFBO0tBQ0g7SUFFRCxPQUFPLE9BQU8sQ0FBQTtBQUNoQixDQUFDO0FBMUJELDBDQTBCQztBQVFELFNBQWdCLGFBQWEsQ0FBQyxLQUFhO0lBQ3pDLE1BQU0sSUFBSSxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RDLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFdkMsT0FBTyxNQUFNO1NBQ1YsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7U0FDbEIsR0FBRyxDQUFDLENBQUMsS0FBdUIsRUFBRSxFQUFFO1FBQy9CLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQzVCLE1BQU0sS0FBSyxHQUF1QjtZQUNoQyxFQUFFLEVBQUUsTUFBTTtZQUNWLElBQUk7WUFDSixRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUTtZQUN6QixNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO1NBQzNCLENBQUE7UUFFRCxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUU7WUFDakQsS0FBSyxDQUFDLE1BQU0sR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQTtTQUMxRDtRQUVELE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUMxRCxJQUFJLElBQUksRUFBRTtZQUNSLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN2QyxLQUFLLENBQUMsTUFBTTtnQkFDVixNQUFNLElBQUksVUFBVSxDQUFDLENBQUMsaUNBQU0sS0FBSyxDQUFDLE1BQU0sR0FBSyxVQUFVLEVBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQTtTQUN6RTtRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2QsQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDO0FBNUJELHNDQTRCQztBQUtELFNBQWdCLGNBQWMsQ0FBQyxLQUFhO0lBQzFDLE1BQU0sT0FBTyxHQUF5QixDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztTQUNsRCxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUM7U0FDekIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQ2YsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBb0IsQ0FBQTtRQUMzRCxPQUFPO1lBQ0wsRUFBRSxFQUFFLE9BQStCO1lBQ25DLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDMUIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDO1lBQ3RDLE1BQU07U0FDUCxDQUFBO0lBQ0gsQ0FBQyxDQUFDO1NBQ0QsS0FBSyxFQUFFLENBQUE7SUFFVixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtJQUM3RCxJQUFJLFdBQVcsRUFBRTtRQUNmLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQXVCLENBQUE7UUFDaEUsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNYLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRTtZQUM3QyxRQUFRLEVBQUUsVUFBVSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUM7WUFDeEMsTUFBTTtTQUNQLENBQUMsQ0FBQTtLQUNIO0lBRUQsT0FBTyxPQUFPLENBQUE7QUFDaEIsQ0FBQztBQTFCRCx3Q0EwQkM7QUFLRCxTQUFnQixjQUFjLENBQUMsS0FBYTtJQUMxQyxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssWUFBWSxDQUFDLENBQUE7SUFDeEUsTUFBTSxnQkFBZ0IsR0FDcEIsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUNuQixDQUFDLEdBQW9CLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQ0FDeEIsR0FBRyxLQUNOLFVBQVUsa0NBQ0wsR0FBRyxDQUFDLFVBQVUsS0FDakIsQ0FBQyxDQUFDLENBQUMsSUFBSyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUU5QixRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7Z0JBQzVCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFLLENBQUM7Z0JBQ3BDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxJQUNoQixFQUNGLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FDakQ7UUFDSCxDQUFDLENBQUMsSUFBSSxDQUFBO0lBRVYsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxDQUFBO0lBRTFELElBQUksUUFBUSxFQUFFO1FBQ1osTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FDWixPQUFPLElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQTtRQUUzRSxPQUFPO1lBQ0wsT0FBTyxFQUFFO2dCQUNQLGtCQUFrQixFQUFFO29CQUNsQixNQUFNLEVBQUUsZ0JBQWdCO3dCQUN0QixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsRUFBRTt3QkFDM0MsQ0FBQyxDQUFDLFVBQVU7aUJBQ2Y7YUFDRjtZQUNELFdBQVcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN0QyxDQUFBO0tBQ0Y7U0FBTSxJQUFJLGdCQUFnQixFQUFFO1FBQzNCLE9BQU87WUFDTCxPQUFPLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxFQUFFO1NBQzlELENBQUE7S0FDRjtBQUNILENBQUM7QUExQ0Qsd0NBMENDO0FBS0QsU0FBZ0IsY0FBYyxDQUFDLEtBQWE7SUFDMUMsTUFBTSxrQkFBa0IsR0FDdEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssTUFBTTtRQUM5QixDQUFDLENBQUMsa0JBQWtCO1FBQ3BCLENBQUMsQ0FBQywwQkFBMEIsQ0FBQTtJQUNoQyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBO0lBQzVFLE9BQU8sV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQTtBQUM3RCxDQUFDO0FBUEQsd0NBT0M7QUFLRCxTQUFnQixhQUFhLENBQUMsS0FBYTtJQUN6QyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBO0lBQzVFLE9BQU8sV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0FBQ3JELENBQUM7QUFIRCxzQ0FHQztBQUtELFNBQWdCLFlBQVksQ0FBQyxLQUFhO0lBQ3hDLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6QyxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFMUMsT0FBTztRQUNMLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDZixPQUFPLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUM5QixXQUFXLEVBQUUscUJBQXFCO1NBQ25DO0tBQ0YsQ0FBQTtBQUNILENBQUM7QUFWRCxvQ0FVQztBQUtELFNBQWdCLE9BQU8sQ0FBQyxNQUFnQjtJQUN0QyxPQUFPO1FBQ0wsVUFBVSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtRQUMzQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUU7UUFDckMsT0FBTyxFQUFFLE9BQU87UUFDaEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7S0FDeEIsQ0FBQTtBQUNILENBQUM7QUFQRCwwQkFPQztBQUtELFNBQWdCLFVBQVUsQ0FBQyxLQUFhO0lBQ3RDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUN2RCxDQUFDO0FBRkQsZ0NBRUM7QUFLRCxTQUFnQixPQUFPLENBQUMsS0FBYTtJQUNuQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDL0UsQ0FBQztBQUZELDBCQUVDO0FBS0QsU0FBZ0Isb0JBQW9CLENBQUMsV0FBbUI7SUFDdEQsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM5QyxPQUFPLE1BQU07U0FDVixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1NBQ3hELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtBQUNiLENBQUM7QUFMRCxvREFLQztBQU1ELFNBQVMsVUFBVSxDQUFDLElBQTRCLEVBQUUsS0FBYTtJQUM3RCxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQTtJQUM3RSxPQUFPLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFBO0FBQ25FLENBQUM7QUFNRCxTQUFTLGNBQWMsQ0FDckIsS0FBd0I7SUFFeEIsTUFBTSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQTtJQUVyRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM1RSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7UUFDL0MsTUFBTSxLQUFLLEdBQUcsWUFBWTtZQUN4QixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsdUJBQXVCLEdBQUcsWUFBWSxDQUFDLElBQUksRUFBRTtZQUN2RCxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7UUFDdEIsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUE7S0FDaEM7SUFDRCxJQUFJLFlBQVksRUFBRTtRQUNoQixPQUFPLEVBQUUsSUFBSSxFQUFFLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtLQUM3RDtJQUNELElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN0QixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzVELE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7U0FDMUI7YUFBTSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7U0FDMUI7YUFBTSxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3RDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUE7U0FDM0I7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO1lBQ2pDLE9BQU8sRUFBRSxJQUFJLEVBQUUsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1NBQ3JEO0tBQ0Y7SUFFRCxPQUFPLEVBQUUsQ0FBQTtBQUNYLENBQUMifQ==