"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = require("lodash");
const generateSpec_1 = require("./generateSpec");
const parseMetadata_1 = require("./parseMetadata");
tslib_1.__exportStar(require("./decorators"), exports);
tslib_1.__exportStar(require("./generateSpec"), exports);
tslib_1.__exportStar(require("./parseMetadata"), exports);
function routingControllersToSpec(storage, routingControllerOptions = {}, additionalProperties = {}) {
    const routes = parseMetadata_1.parseRoutes(storage, routingControllerOptions);
    const spec = generateSpec_1.getSpec(routes);
    return _.merge(spec, additionalProperties);
}
exports.routingControllersToSpec = routingControllersToSpec;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTJCO0FBTzNCLGlEQUF3QztBQUN4QyxtREFBNkM7QUFFN0MsdURBQTRCO0FBQzVCLHlEQUE4QjtBQUM5QiwwREFBK0I7QUFTL0IsU0FBZ0Isd0JBQXdCLENBQ3RDLE9BQTRCLEVBQzVCLDJCQUFzRCxFQUFFLEVBQ3hELHVCQUFrRCxFQUFFO0lBRXBELE1BQU0sTUFBTSxHQUFHLDJCQUFXLENBQUMsT0FBTyxFQUFFLHdCQUF3QixDQUFDLENBQUE7SUFDN0QsTUFBTSxJQUFJLEdBQUcsc0JBQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUU1QixPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUE7QUFDNUMsQ0FBQztBQVRELDREQVNDIn0=