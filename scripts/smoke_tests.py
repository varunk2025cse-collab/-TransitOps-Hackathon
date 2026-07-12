import sys
import json
import requests
from odoo import api, SUPERUSER_ID
from odoo.modules.registry import Registry
from odoo.tools import config as odoo_config

odoo_config.parse_config(['-c', 'odoo.conf'])
DB_NAME = 'transitops'

BASE_URL = 'http://localhost:8069'
FRONTEND_URL = 'http://localhost:4173'

def http_checks():
    results = []
    try:
        r = requests.get(FRONTEND_URL, timeout=5)
        results.append(('frontend', r.status_code))
    except Exception as e:
        results.append(('frontend', f'error: {e}'))

    try:
        r = requests.get(f'{BASE_URL}/', timeout=5)
        results.append(('backend_root', r.status_code))
    except Exception as e:
        results.append(('backend_root', f'error: {e}'))

    # CORS preflight
    try:
        r = requests.options(f'{BASE_URL}/api/v1/vehicles', timeout=5)
        results.append(('cors_preflight', r.status_code))
    except Exception as e:
        results.append(('cors_preflight', f'error: {e}'))

    # Try login with admin/admin (may or may not work depending on DB user)
    try:
        r = requests.post(f'{BASE_URL}/api/v1/auth/login', json={'db': DB_NAME, 'login': 'admin', 'password': 'admin'}, timeout=5)
        results.append(('http_login_admin', (r.status_code, r.text[:200])))
    except Exception as e:
        results.append(('http_login_admin', f'error: {e}'))

    return results

def orm_workflows():
    failures = []
    with Registry(DB_NAME).cursor() as cr:
        env = api.Environment(cr, SUPERUSER_ID, {})

        Vehicle = env['transitops.vehicle']
        Driver = env['transitops.driver']
        Trip = env['transitops.trip']
        Maintenance = env['transitops.maintenance']
        FuelLog = env['transitops.fuel.log']
        Expense = env['transitops.expense']

        # Vehicle CRUD
        v = Vehicle.create({'name': 'Smoke Van', 'registration_number': 'SMK-1', 'vehicle_type': 'van', 'max_capacity': 1000})
        if not v.id:
            failures.append('vehicle_create_failed')
        v.write({'odometer': 1000})
        v_id = v.id

        # Driver CRUD
        d = Driver.create({'name': 'Smoke Driver', 'license_number': 'SMK-L', 'license_expiry': '2099-01-01'})
        if not d.id:
            failures.append('driver_create_failed')
        d_id = d.id

        # Trip creation & dispatch
        t = Trip.create({'source': 'X', 'destination': 'Y', 'vehicle_id': v_id, 'driver_id': d_id, 'cargo_weight': 100, 'planned_distance': 10})
        if not t.id:
            failures.append('trip_create_failed')
        t.action_dispatch()
        if t.status != 'dispatched' or v.status != 'on_trip' or d.status != 'on_trip':
            failures.append('trip_dispatch_state_mismatch')

        # Trip completion
        t.write({'end_odometer': 1010, 'revenue': 200})
        t.action_complete()
        if t.status != 'completed' or v.status == 'on_trip' or d.status == 'on_trip':
            failures.append('trip_complete_state_mismatch')

        # Maintenance workflow
        m = Maintenance.create({'vehicle_id': v_id, 'date': '2026-07-01', 'description': 'Brake check', 'maintenance_type': 'corrective', 'cost': 150})
        if not m.id:
            failures.append('maintenance_create_failed')
        if v.status != 'in_shop':
            failures.append('vehicle_should_be_in_shop_after_maintenance')
        m.action_close()
        if v.status != 'available':
            failures.append('vehicle_should_be_available_after_maintenance_close')

        # Fuel logging
        f = FuelLog.create({'vehicle_id': v_id, 'date': '2026-07-02', 'liters': 50, 'cost': 100, 'odometer_at_fill': 1010})
        if not f.id:
            failures.append('fuel_log_create_failed')

        # Expenses
        e = Expense.create({'vehicle_id': v_id, 'date': '2026-07-02', 'category': 'toll', 'amount': 20, 'description': 'Bridge toll'})
        if not e.id:
            failures.append('expense_create_failed')

        # Dashboard KPIs basic checks
        kpi = env['transitops.vehicle'].search_count([])
        if kpi <= 0:
            failures.append('kpi_no_vehicles')

        cr.commit()

    return failures

def main():
    print('Running HTTP checks...')
    http = http_checks()
    for k, v in http:
        print(k, v)

    print('\nRunning ORM workflows...')
    orm_failures = orm_workflows()
    if orm_failures:
        print('ORM FAILURES:')
        for f in orm_failures:
            print('-', f)
        sys.exit(1)
    print('ORM workflows passed')
    print('\nSmoke tests completed successfully')

if __name__ == '__main__':
    main()
