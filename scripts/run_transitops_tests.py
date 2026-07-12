import sys
from odoo import api, SUPERUSER_ID
from odoo.modules.registry import Registry
from odoo.exceptions import ValidationError
from odoo.tools import config as odoo_config

# Ensure odoo.conf is parsed so Registry picks up DB credentials
odoo_config.parse_config(['-c', 'odoo.conf'])

DB_NAME = 'transitops'

def run_tests():
    failures = []
    with Registry(DB_NAME).cursor() as cr:
        env = api.Environment(cr, SUPERUSER_ID, {})
        Vehicle = env['transitops.vehicle']
        Driver = env['transitops.driver']
        Trip = env['transitops.trip']

        # Test 1: valid dispatch
        try:
            vehicle = Vehicle.create({
                'name': 'Script Van',
                'registration_number': 'SCR-01',
                'vehicle_type': 'van',
                'max_capacity': 500,
            })
            driver = Driver.create({
                'name': 'Script Driver',
                'license_number': 'SCR-LIC',
                'license_expiry': '2099-12-31',
            })
            trip = Trip.create({
                'source': 'A',
                'destination': 'B',
                'vehicle_id': vehicle.id,
                'driver_id': driver.id,
                'cargo_weight': 400,
            })
            trip.action_dispatch()
            if not (trip.status == 'dispatched' and vehicle.status == 'on_trip' and driver.status == 'on_trip'):
                failures.append('test_01_dispatch_valid_trip: state mismatch')
        except Exception as e:
            failures.append(f'test_01_dispatch_valid_trip: exception {e}')

        # Test 2: overweight trip should raise ValidationError
        try:
            try:
                Trip.create({
                    'source': 'A',
                    'destination': 'B',
                    'vehicle_id': vehicle.id,
                    'driver_id': driver.id,
                    'cargo_weight': 600,
                })
                failures.append('test_02_dispatch_overweight_trip: expected ValidationError not raised')
            except ValidationError:
                pass
        except Exception as e:
            failures.append(f'test_02_dispatch_overweight_trip: exception {e}')

        # commit changes
        cr.commit()

    if failures:
        print('FAILURES:')
        for f in failures:
            print('-', f)
        return 1
    print('All transitops_core tests passed')
    return 0

if __name__ == '__main__':
    sys.exit(run_tests())
