"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
function parseRoutes(storage, options = {}) {
    return storage.actions.map(action => ({
        action,
        controller: _.find(storage.controllers, {
            target: action.target
        }),
        options,
        params: _.sortBy(storage.filterParamsWithTargetAndMethod(action.target, action.method), 'index'),
        responseHandlers: storage.filterResponseHandlersWithTargetAndMethod(action.target, action.method)
    }));
}
exports.parseRoutes = parseRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VNZXRhZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXJzZU1ldGFkYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsNEJBQTJCO0FBd0IzQixTQUFnQixXQUFXLENBQ3pCLE9BQTRCLEVBQzVCLFVBQXFDLEVBQUU7SUFFdkMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEMsTUFBTTtRQUNOLFVBQVUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7WUFDdEMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1NBQ3RCLENBQTJCO1FBQzVCLE9BQU87UUFDUCxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FDZCxPQUFPLENBQUMsK0JBQStCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQ3JFLE9BQU8sQ0FDUjtRQUNELGdCQUFnQixFQUFFLE9BQU8sQ0FBQyx5Q0FBeUMsQ0FDakUsTUFBTSxDQUFDLE1BQU0sRUFDYixNQUFNLENBQUMsTUFBTSxDQUNkO0tBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDTCxDQUFDO0FBbkJELGtDQW1CQyJ9