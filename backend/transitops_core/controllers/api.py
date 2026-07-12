import json
import logging
from datetime import date

from odoo import http
from odoo.http import request, Response
from odoo.exceptions import ValidationError, AccessError

_logger = logging.getLogger(__name__)


ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']


def _get_cors_headers():
    origin = request.httprequest.headers.get('Origin')
    allowed_origin = origin if origin in ALLOWED_ORIGINS else 'null'
    return {
        'Access-Control-Allow-Origin': allowed_origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
    }


def _json_response(data, status=200):
    """Utility: return a standard JSON response with CORS headers."""
    body = json.dumps(data, default=str)
    return Response(
        body,
        status=status,
        content_type='application/json',
        headers=_get_cors_headers(),
    )


def _error(message, code='VALIDATION_ERROR', status=400):
    return _json_response({'status': 'error', 'code': code, 'message': message}, status)


def _cors_options_response():
    # For preflight requests, reply with a permissive origin '*' to satisfy
    # dev tooling that expects a wildcard on OPTIONS; actual responses echo origin.
    headers = _get_cors_headers()
    headers['Access-Control-Allow-Origin'] = '*'
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    headers['Access-Control-Max-Age'] = '86400'
    return Response(status=204, headers=headers)


class TransitOpsAPI(http.Controller):
    """REST API endpoints for the React frontend."""

    # ═══════════════════════════════════════════════════════════════════
    #  CORS preflight handler
    # ═══════════════════════════════════════════════════════════════════
    @http.route(
        '/api/v1/<path:path>',
        type='http', auth='none', methods=['OPTIONS'], csrf=False, cors='*',
    )
    def cors_preflight(self, path=None, **kw):
        return _cors_options_response()

    @http.route('/api/v1/auth/login', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/auth/logout', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/auth/me', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/vehicles', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/vehicles/<int:vehicle_id>', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/drivers', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/drivers/<int:driver_id>', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/trips', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/trips/dispatch', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/trips/<int:trip_id>/complete', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/trips/<int:trip_id>/cancel', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/maintenance', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/maintenance/<int:log_id>/close', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/fuel-logs', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/expenses', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/dashboard/kpi', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/dashboard/charts', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    @http.route('/api/v1/intelligence/fleet-health', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    def options(self, **kw):
        return _cors_options_response()

    # ═══════════════════════════════════════════════════════════════════
    #  AUTH
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/auth/login', type='http', auth='none', methods=['POST'], csrf=False)
    def login(self, **kw):
        try:
            # Preflight and empty-body guard
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            data = json.loads(request.httprequest.data)
            db = data.get('db', request.db)
            login = data.get('login')
            password = data.get('password')
            if not login or not password:
                return _error('Login and password are required.', status=400)

            uid = request.session.authenticate(db, login, password)
            if uid:
                user = request.env['res.users'].sudo().browse(uid)
                return _json_response({
                    'status': 'success',
                    'data': {
                        'uid': uid,
                        'name': user.name,
                        'email': user.login,
                        'session_id': request.session.sid,
                    },
                })
            return _error('Invalid credentials.', code='AUTH_FAILED', status=401)
        except Exception as e:
            _logger.exception('Login error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    @http.route('/api/v1/auth/logout', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def logout(self, **kw):
        # Support OPTIONS preflight and manual auth check for POST
        if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
            return _cors_options_response()
        if not request.session.uid:
            return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
        request.session.logout()
        return _json_response({'status': 'success', 'message': 'Logged out.'})

    @http.route('/api/v1/auth/me', type='http', auth='user', methods=['GET'], csrf=False)
    def me(self, **kw):
        user = request.env.user
        return _json_response({
            'status': 'success',
            'data': {'uid': user.id, 'name': user.name, 'email': user.login},
        })

    # ═══════════════════════════════════════════════════════════════════
    #  VEHICLES
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/vehicles', type='http', auth='user', methods=['GET'], csrf=False)
    def get_vehicles(self, **kw):
        vehicles = request.env['transitops.vehicle'].search([])
        data = []
        for v in vehicles:
            data.append({
                'id': v.id,
                'name': v.name,
                'registration_number': v.registration_number,
                'vehicle_type': v.vehicle_type,
                'max_capacity': v.max_capacity,
                'odometer': v.odometer,
                'acquisition_cost': v.acquisition_cost,
                'status': v.status,
                'total_operational_cost': v.total_operational_cost,
                'roi': v.roi,
                'fuel_efficiency': v.fuel_efficiency,
            })
        return _json_response({'status': 'success', 'data': data})

    @http.route('/api/v1/vehicles', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def create_vehicle(self, **kw):
        try:
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            # Require session for actual POST
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            data_bytes = request.httprequest.data
            # guard against empty body or non-json
            if not data_bytes:
                return _cors_options_response()
            data = json.loads(data_bytes)
            vehicle = request.env['transitops.vehicle'].create({
                'name': data.get('name'),
                'registration_number': data.get('registration_number'),
                'vehicle_type': data.get('vehicle_type', 'van'),
                'max_capacity': data.get('max_capacity', 0),
                'odometer': data.get('odometer', 0),
                'acquisition_cost': data.get('acquisition_cost', 0),
            })
            return _json_response({
                'status': 'success',
                'data': {'id': vehicle.id, 'name': vehicle.name},
            }, status=201)
        except ValidationError as e:
            return _error(str(e))
        except Exception as e:
            _logger.exception('Create vehicle error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    @http.route('/api/v1/vehicles/<int:vehicle_id>', type='http', auth='none', methods=['PUT','OPTIONS'], csrf=False)
    def update_vehicle(self, vehicle_id, **kw):
        try:
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            data_bytes = request.httprequest.data
            if not data_bytes:
                return _cors_options_response()
            data = json.loads(data_bytes)
            vehicle = request.env['transitops.vehicle'].browse(vehicle_id)
            if not vehicle.exists():
                return _error('Vehicle not found.', code='NOT_FOUND', status=404)
            vehicle.write(data)
            return _json_response({'status': 'success', 'message': 'Vehicle updated.'})
        except ValidationError as e:
            return _error(str(e))
        except Exception as e:
            _logger.exception('Update vehicle error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    @http.route('/api/v1/vehicles/<int:vehicle_id>', type='http', auth='none', methods=['DELETE','OPTIONS'], csrf=False)
    def delete_vehicle(self, vehicle_id, **kw):
        try:
            if request.httprequest.method == 'OPTIONS':
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            vehicle = request.env['transitops.vehicle'].browse(vehicle_id)
            if not vehicle.exists():
                return _error('Vehicle not found.', code='NOT_FOUND', status=404)
            vehicle.unlink()
            return _json_response({'status': 'success', 'message': 'Vehicle deleted.'})
        except Exception as e:
            _logger.exception('Delete vehicle error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    # ═══════════════════════════════════════════════════════════════════
    #  DRIVERS
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/drivers', type='http', auth='user', methods=['GET'], csrf=False)
    def get_drivers(self, **kw):
        drivers = request.env['transitops.driver'].search([])
        data = []
        for d in drivers:
            data.append({
                'id': d.id,
                'name': d.name,
                'license_number': d.license_number,
                'license_category': d.license_category,
                'license_expiry': d.license_expiry,
                'contact_number': d.contact_number,
                'email': d.email,
                'safety_score': d.safety_score,
                'status': d.status,
                'is_license_expired': d.is_license_expired,
            })
        return _json_response({'status': 'success', 'data': data})

    @http.route('/api/v1/drivers', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def create_driver(self, **kw):
        try:
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            data_bytes = request.httprequest.data
            if not data_bytes:
                return _cors_options_response()
            data = json.loads(data_bytes)
            driver = request.env['transitops.driver'].create({
                'name': data.get('name'),
                'license_number': data.get('license_number'),
                'license_category': data.get('license_category', ''),
                'license_expiry': data.get('license_expiry'),
                'contact_number': data.get('contact_number', ''),
                'email': data.get('email', ''),
                'safety_score': data.get('safety_score', 100),
            })
            return _json_response({
                'status': 'success',
                'data': {'id': driver.id, 'name': driver.name},
            }, status=201)
        except ValidationError as e:
            return _error(str(e))
        except Exception as e:
            _logger.exception('Create driver error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    @http.route('/api/v1/drivers/<int:driver_id>', type='http', auth='none', methods=['PUT','OPTIONS'], csrf=False)
    def update_driver(self, driver_id, **kw):
        try:
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            data_bytes = request.httprequest.data
            if not data_bytes:
                return _cors_options_response()
            data = json.loads(data_bytes)
            driver = request.env['transitops.driver'].browse(driver_id)
            if not driver.exists():
                return _error('Driver not found.', code='NOT_FOUND', status=404)
            driver.write(data)
            return _json_response({'status': 'success', 'message': 'Driver updated.'})
        except ValidationError as e:
            return _error(str(e))
        except Exception as e:
            _logger.exception('Update driver error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    # ═══════════════════════════════════════════════════════════════════
    #  TRIPS
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/trips', type='http', auth='user', methods=['GET'], csrf=False)
    def get_trips(self, **kw):
        trips = request.env['transitops.trip'].search([])
        data = []
        for t in trips:
            data.append({
                'id': t.id,
                'name': t.name,
                'source': t.source,
                'destination': t.destination,
                'vehicle_id': t.vehicle_id.id,
                'vehicle_name': t.vehicle_id.name,
                'vehicle_reg': t.vehicle_id.registration_number,
                'driver_id': t.driver_id.id,
                'driver_name': t.driver_id.name,
                'cargo_weight': t.cargo_weight,
                'planned_distance': t.planned_distance,
                'actual_distance': t.actual_distance,
                'revenue': t.revenue,
                'status': t.status,
                'scheduled_date': t.scheduled_date,
                'completion_date': t.completion_date,
            })
        return _json_response({'status': 'success', 'data': data})

    @http.route('/api/v1/trips/dispatch', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def dispatch_trip(self, **kw):
        try:
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            data_bytes = request.httprequest.data
            if not data_bytes:
                return _cors_options_response()
            data = json.loads(data_bytes)
            trip = request.env['transitops.trip'].create({
                'source': data.get('source'),
                'destination': data.get('destination'),
                'vehicle_id': data.get('vehicle_id'),
                'driver_id': data.get('driver_id'),
                'cargo_weight': data.get('cargo_weight', 0),
                'planned_distance': data.get('planned_distance', 0),
                'revenue': data.get('revenue', 0),
                'scheduled_date': data.get('scheduled_date'),
            })
            trip.action_dispatch()
            return _json_response({
                'status': 'success',
                'data': {'trip_id': trip.id, 'name': trip.name},
                'message': 'Trip dispatched. Vehicle and driver are now On Trip.',
            }, status=201)
        except ValidationError as e:
            return _error(str(e), code='BUSINESS_RULE_VIOLATION')
        except Exception as e:
            _logger.exception('Dispatch trip error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    @http.route('/api/v1/trips/<int:trip_id>/complete', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def complete_trip(self, trip_id, **kw):
        try:
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            data_bytes = request.httprequest.data
            if not data_bytes:
                return _cors_options_response()
            data = json.loads(data_bytes)
            trip = request.env['transitops.trip'].browse(trip_id)
            if not trip.exists():
                return _error('Trip not found.', code='NOT_FOUND', status=404)
            trip.write({
                'end_odometer': data.get('end_odometer', 0),
                'revenue': data.get('revenue', trip.revenue),
            })
            trip.action_complete()
            return _json_response({
                'status': 'success',
                'message': 'Trip completed. Vehicle and driver released.',
            })
        except ValidationError as e:
            return _error(str(e), code='BUSINESS_RULE_VIOLATION')
        except Exception as e:
            _logger.exception('Complete trip error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    @http.route('/api/v1/trips/<int:trip_id>/cancel', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def cancel_trip(self, trip_id, **kw):
        try:
            if request.httprequest.method == 'OPTIONS':
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            trip = request.env['transitops.trip'].browse(trip_id)
            if not trip.exists():
                return _error('Trip not found.', code='NOT_FOUND', status=404)
            trip.action_cancel()
            return _json_response({
                'status': 'success',
                'message': 'Trip cancelled. Assets released.',
            })
        except ValidationError as e:
            return _error(str(e), code='BUSINESS_RULE_VIOLATION')
        except Exception as e:
            _logger.exception('Cancel trip error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    # ═══════════════════════════════════════════════════════════════════
    #  MAINTENANCE
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/maintenance', type='http', auth='user', methods=['GET'], csrf=False)
    def get_maintenance(self, **kw):
        logs = request.env['transitops.maintenance'].search([])
        data = []
        for m in logs:
            data.append({
                'id': m.id,
                'vehicle_id': m.vehicle_id.id,
                'vehicle_name': m.vehicle_id.name,
                'vehicle_reg': m.vehicle_id.registration_number,
                'date': m.date,
                'description': m.description,
                'maintenance_type': m.maintenance_type,
                'cost': m.cost,
                'status': m.status,
            })
        return _json_response({'status': 'success', 'data': data})

    @http.route('/api/v1/maintenance', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def create_maintenance(self, **kw):
        try:
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            data_bytes = request.httprequest.data
            if not data_bytes:
                return _cors_options_response()
            data = json.loads(data_bytes)
            log = request.env['transitops.maintenance'].create({
                'vehicle_id': data.get('vehicle_id'),
                'date': data.get('date'),
                'description': data.get('description'),
                'maintenance_type': data.get('maintenance_type', 'corrective'),
                'cost': data.get('cost', 0),
            })
            return _json_response({
                'status': 'success',
                'data': {'id': log.id},
                'message': 'Maintenance log created. Vehicle is now In Shop.',
            }, status=201)
        except ValidationError as e:
            return _error(str(e), code='BUSINESS_RULE_VIOLATION')
        except Exception as e:
            _logger.exception('Create maintenance error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    @http.route('/api/v1/maintenance/<int:log_id>/close', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def close_maintenance(self, log_id, **kw):
        try:
            if request.httprequest.method == 'OPTIONS':
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            log = request.env['transitops.maintenance'].browse(log_id)
            if not log.exists():
                return _error('Maintenance log not found.', code='NOT_FOUND', status=404)
            log.action_close()
            return _json_response({
                'status': 'success',
                'message': 'Maintenance closed. Vehicle is now Available.',
            })
        except ValidationError as e:
            return _error(str(e), code='BUSINESS_RULE_VIOLATION')
        except Exception as e:
            _logger.exception('Close maintenance error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    # ═══════════════════════════════════════════════════════════════════
    #  FUEL LOGS
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/fuel-logs', type='http', auth='user', methods=['GET'], csrf=False)
    def get_fuel_logs(self, **kw):
        logs = request.env['transitops.fuel.log'].search([])
        data = []
        for f in logs:
            data.append({
                'id': f.id,
                'vehicle_id': f.vehicle_id.id,
                'vehicle_name': f.vehicle_id.name,
                'trip_id': f.trip_id.id if f.trip_id else None,
                'date': f.date,
                'liters': f.liters,
                'cost': f.cost,
                'odometer_at_fill': f.odometer_at_fill,
            })
        return _json_response({'status': 'success', 'data': data})

    @http.route('/api/v1/fuel-logs', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def create_fuel_log(self, **kw):
        try:
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            data_bytes = request.httprequest.data
            if not data_bytes:
                return _cors_options_response()
            data = json.loads(data_bytes)
            log = request.env['transitops.fuel.log'].create({
                'vehicle_id': data.get('vehicle_id'),
                'trip_id': data.get('trip_id'),
                'date': data.get('date'),
                'liters': data.get('liters', 0),
                'cost': data.get('cost', 0),
                'odometer_at_fill': data.get('odometer_at_fill', 0),
                'notes': data.get('notes', ''),
            })
            return _json_response({
                'status': 'success',
                'data': {'id': log.id},
            }, status=201)
        except Exception as e:
            _logger.exception('Create fuel log error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    # ═══════════════════════════════════════════════════════════════════
    #  EXPENSES
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/expenses', type='http', auth='user', methods=['GET'], csrf=False)
    def get_expenses(self, **kw):
        expenses = request.env['transitops.expense'].search([])
        data = []
        for e in expenses:
            data.append({
                'id': e.id,
                'vehicle_id': e.vehicle_id.id,
                'vehicle_name': e.vehicle_id.name,
                'trip_id': e.trip_id.id if e.trip_id else None,
                'date': e.date,
                'category': e.category,
                'amount': e.amount,
                'description': e.description,
            })
        return _json_response({'status': 'success', 'data': data})

    @http.route('/api/v1/expenses', type='http', auth='none', methods=['POST','OPTIONS'], csrf=False)
    def create_expense(self, **kw):
        try:
            if request.httprequest.method == 'OPTIONS' or not request.httprequest.data:
                return _cors_options_response()
            if not request.session.uid:
                return _error('Authentication required.', code='AUTH_REQUIRED', status=401)
            data_bytes = request.httprequest.data
            if not data_bytes:
                return _cors_options_response()
            data = json.loads(data_bytes)
            expense = request.env['transitops.expense'].create({
                'vehicle_id': data.get('vehicle_id'),
                'trip_id': data.get('trip_id'),
                'date': data.get('date'),
                'category': data.get('category', 'other'),
                'amount': data.get('amount', 0),
                'description': data.get('description', ''),
            })
            return _json_response({
                'status': 'success',
                'data': {'id': expense.id},
            }, status=201)
        except Exception as e:
            _logger.exception('Create expense error')
            return _error(str(e), code='SERVER_ERROR', status=500)

    # ═══════════════════════════════════════════════════════════════════
    #  DASHBOARD KPIs
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/dashboard/kpi', type='http', auth='user', methods=['GET'], csrf=False)
    def dashboard_kpi(self, **kw):
        Vehicle = request.env['transitops.vehicle']
        Driver = request.env['transitops.driver']
        Trip = request.env['transitops.trip']
        Maintenance = request.env['transitops.maintenance']
        FuelLog = request.env['transitops.fuel.log']
        Expense = request.env['transitops.expense']

        total_vehicles = Vehicle.search_count([('status', '!=', 'retired')])
        available_vehicles = Vehicle.search_count([('status', '=', 'available')])
        on_trip_vehicles = Vehicle.search_count([('status', '=', 'on_trip')])
        in_shop_vehicles = Vehicle.search_count([('status', '=', 'in_shop')])

        total_drivers = Driver.search_count([])
        available_drivers = Driver.search_count([('status', '=', 'available')])
        on_duty_drivers = Driver.search_count([('status', '=', 'on_trip')])

        active_trips = Trip.search_count([('status', '=', 'dispatched')])
        completed_trips = Trip.search_count([('status', '=', 'completed')])
        total_trips = Trip.search_count([])

        fleet_utilization = round(
            (on_trip_vehicles / total_vehicles * 100) if total_vehicles > 0 else 0, 1
        )

        # Financial aggregates
        total_maintenance_cost = sum(
            Maintenance.search([]).mapped('cost')
        )
        total_fuel_cost = sum(
            FuelLog.search([]).mapped('cost')
        )
        total_expense_amount = sum(
            Expense.search([]).mapped('amount')
        )
        total_revenue = sum(
            Trip.search([('status', '=', 'completed')]).mapped('revenue')
        )
        total_operational_cost = total_maintenance_cost + total_fuel_cost + total_expense_amount

        return _json_response({
            'status': 'success',
            'data': {
                'total_vehicles': total_vehicles,
                'available_vehicles': available_vehicles,
                'on_trip_vehicles': on_trip_vehicles,
                'in_shop_vehicles': in_shop_vehicles,
                'total_drivers': total_drivers,
                'available_drivers': available_drivers,
                'on_duty_drivers': on_duty_drivers,
                'active_trips': active_trips,
                'completed_trips': completed_trips,
                'total_trips': total_trips,
                'fleet_utilization': fleet_utilization,
                'total_maintenance_cost': total_maintenance_cost,
                'total_fuel_cost': total_fuel_cost,
                'total_expense_amount': total_expense_amount,
                'total_revenue': total_revenue,
                'total_operational_cost': total_operational_cost,
            },
        })

    # ═══════════════════════════════════════════════════════════════════
    #  DASHBOARD CHARTS DATA
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/dashboard/charts', type='http', auth='user', methods=['GET'], csrf=False)
    def dashboard_charts(self, **kw):
        Vehicle = request.env['transitops.vehicle']
        Trip = request.env['transitops.trip']

        # Vehicle status distribution
        vehicle_status = {
            'available': Vehicle.search_count([('status', '=', 'available')]),
            'on_trip': Vehicle.search_count([('status', '=', 'on_trip')]),
            'in_shop': Vehicle.search_count([('status', '=', 'in_shop')]),
            'retired': Vehicle.search_count([('status', '=', 'retired')]),
        }

        # Recent trips for trend
        recent_trips = Trip.search([('status', '=', 'completed')], order='completion_date desc', limit=10)
        trip_trend = []
        for t in recent_trips:
            trip_trend.append({
                'name': t.name,
                'distance': t.actual_distance or t.planned_distance,
                'revenue': t.revenue,
                'date': t.completion_date,
            })

        return _json_response({
            'status': 'success',
            'data': {
                'vehicle_status_distribution': vehicle_status,
                'trip_trend': trip_trend,
            },
        })

    # ═══════════════════════════════════════════════════════════════════
    #  FLEET HEALTH SCORE (Lightweight Intelligence)
    # ═══════════════════════════════════════════════════════════════════
    @http.route('/api/v1/intelligence/fleet-health', type='http', auth='user', methods=['GET'], csrf=False)
    def fleet_health(self, **kw):
        Vehicle = request.env['transitops.vehicle']
        Driver = request.env['transitops.driver']
        Maintenance = request.env['transitops.maintenance']

        active_vehicles = Vehicle.search([('status', '!=', 'retired')])
        total = len(active_vehicles)
        if total == 0:
            return _json_response({'status': 'success', 'data': {'score': 100, 'alerts': []}})

        score = 100
        alerts = []

        # Deduct for vehicles in shop
        in_shop = Vehicle.search_count([('status', '=', 'in_shop')])
        score -= in_shop * 5
        if in_shop > 0:
            alerts.append({
                'type': 'warning',
                'message': f'{in_shop} vehicle(s) currently in the maintenance shop.',
            })

        # Deduct for active maintenance
        active_maint = Maintenance.search_count([('status', '=', 'active')])
        score -= active_maint * 3

        # Deduct for expired licenses
        expired_drivers = Driver.search_count([('is_license_expired', '=', True)])
        score -= expired_drivers * 10
        if expired_drivers > 0:
            alerts.append({
                'type': 'critical',
                'message': f'{expired_drivers} driver(s) have expired licenses!',
            })

        # Deduct for suspended drivers
        suspended = Driver.search_count([('status', '=', 'suspended')])
        score -= suspended * 8
        if suspended > 0:
            alerts.append({
                'type': 'warning',
                'message': f'{suspended} driver(s) are currently suspended.',
            })

        # Recommendations
        recommendations = []
        if in_shop > 0:
            recommendations.append('Prioritize completing pending maintenance to increase fleet availability.')
        if expired_drivers > 0:
            recommendations.append('Renew expired driver licenses immediately to avoid compliance risks.')

        return _json_response({
            'status': 'success',
            'data': {
                'score': max(0, score),
                'alerts': alerts,
                'recommendations': recommendations,
            },
        })
