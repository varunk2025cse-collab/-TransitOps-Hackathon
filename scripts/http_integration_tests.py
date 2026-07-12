import sys
import requests
from datetime import date, timedelta

BASE_URL = 'http://localhost:8069'
FRONTEND_URL = 'http://localhost:5173'
DB_NAME = 'transitops'

s = requests.Session()


def check_frontend():
    r = requests.get(FRONTEND_URL, timeout=10)
    assert r.status_code == 200, f'Frontend not reachable: {r.status_code}'


def check_backend():
    r = requests.get(f'{BASE_URL}/', timeout=10)
    assert r.status_code == 200, f'Backend not reachable: {r.status_code}'


def auth_flow():
    payload = {'db': DB_NAME, 'login': 'admin', 'password': 'admin'}
    r = s.post(f'{BASE_URL}/api/v1/auth/login', json=payload, timeout=10)
    assert r.status_code == 200, f'Auth failed: {r.status_code} {r.text}'
    data = r.json()
    assert data['status'] == 'success', f'Auth failed body: {data}'
    return data['data']


def get_with_auth(path):
    r = s.get(
        f'{BASE_URL}{path}',
        headers={'Origin': FRONTEND_URL},
        timeout=10,
    )
    assert r.status_code == 200, f'GET {path} failed: {r.status_code} {r.text}'
    assert r.headers.get('Access-Control-Allow-Origin') == FRONTEND_URL, 'CORS header missing'
    return r.json()


def post_with_auth(path, payload, expected_status=200):
    r = s.post(
        f'{BASE_URL}{path}',
        json=payload,
        headers={'Origin': FRONTEND_URL},
        timeout=10,
    )
    assert r.status_code == expected_status, f'POST {path} failed: {r.status_code} {r.text}'
    assert r.headers.get('Access-Control-Allow-Origin') == FRONTEND_URL, 'CORS header missing'
    return r.json()


def put_with_auth(path, payload, expected_status=200):
    r = s.put(
        f'{BASE_URL}{path}',
        json=payload,
        headers={'Origin': FRONTEND_URL},
        timeout=10,
    )
    assert r.status_code == expected_status, f'PUT {path} failed: {r.status_code} {r.text}'
    assert r.headers.get('Access-Control-Allow-Origin') == FRONTEND_URL, 'CORS header missing'
    return r.json()


def test_vehicles():
    print('Testing vehicles...')
    v1 = post_with_auth('/api/v1/vehicles', {
        'name': 'HTTP Van',
        'registration_number': 'HTTP-1',
        'vehicle_type': 'van',
        'max_capacity': 500,
        'odometer': 100,
        'acquisition_cost': 10000,
    }, expected_status=201)['data']

    # Duplicate registration should fail
    r = s.post(f'{BASE_URL}/api/v1/vehicles', json={
        'name': 'HTTP Van 2',
        'registration_number': 'HTTP-1',
        'vehicle_type': 'van',
        'max_capacity': 400,
    }, timeout=10)
    assert r.status_code != 201, 'Duplicate registration should be rejected'

    put_with_auth(f'/api/v1/vehicles/{v1["id"]}', {'odometer': 150})
    vehicles = get_with_auth('/api/v1/vehicles')['data']
    assert any(v['id'] == v1['id'] for v in vehicles), 'Created vehicle missing'

    return v1['id']


def test_drivers():
    print('Testing drivers...')
    expired = (date.today() - timedelta(days=10)).isoformat()
    r = s.post(f'{BASE_URL}/api/v1/drivers', json={
        'name': 'Expired Driver',
        'license_number': 'EX-01',
        'license_expiry': expired,
    }, timeout=10)
    assert r.status_code == 201, f'Expired driver create failed: {r.status_code} {r.text}'
    expired_id = r.json()['data']['id']

    valid = post_with_auth('/api/v1/drivers', {
        'name': 'HTTP Driver',
        'license_number': 'DR-01',
        'license_expiry': (date.today() + timedelta(days=365)).isoformat(),
    }, expected_status=201)['data']

    drivers = get_with_auth('/api/v1/drivers')['data']
    assert any(d['id'] == valid['id'] for d in drivers), 'Created driver missing'

    return expired_id, valid['id']


def test_trip_workflow(vehicle_id, driver_id, expired_driver_id):
    print('Testing trips...')
    # Overweight validation
    r = s.post(f'{BASE_URL}/api/v1/trips/dispatch', json={
        'source': 'A',
        'destination': 'B',
        'vehicle_id': vehicle_id,
        'driver_id': driver_id,
        'cargo_weight': 600,
        'planned_distance': 10,
        'revenue': 100,
    }, timeout=10)
    assert r.status_code != 201, 'Overweight dispatch should fail'

    # Expired driver validation
    r = s.post(f'{BASE_URL}/api/v1/trips/dispatch', json={
        'source': 'A',
        'destination': 'B',
        'vehicle_id': vehicle_id,
        'driver_id': expired_driver_id,
        'cargo_weight': 100,
        'planned_distance': 10,
        'revenue': 100,
    }, timeout=10)
    assert r.status_code != 201, 'Dispatch with expired driver should fail'

    # Valid dispatch
    trip = post_with_auth('/api/v1/trips/dispatch', {
        'source': 'A',
        'destination': 'B',
        'vehicle_id': vehicle_id,
        'driver_id': driver_id,
        'cargo_weight': 200,
        'planned_distance': 10,
        'revenue': 250,
    }, expected_status=201)['data']
    trip_id = trip['trip_id']

    trips = get_with_auth('/api/v1/trips')['data']
    matching = [t for t in trips if t['id'] == trip_id]
    assert matching and matching[0]['status'] == 'dispatched', 'Trip not dispatched'

    # Complete trip
    post_with_auth(f'/api/v1/trips/{trip_id}/complete', {'end_odometer': 300, 'revenue': 250})
    trips = get_with_auth('/api/v1/trips')['data']
    matching = [t for t in trips if t['id'] == trip_id]
    assert matching and matching[0]['status'] == 'completed', 'Trip did not complete'
    assert matching[0]['actual_distance'] == 200 or matching[0]['actual_distance'] == 0, 'Actual distance missing'

    # Cancel trip flow
    cancel_trip = post_with_auth('/api/v1/trips/dispatch', {
        'source': 'C',
        'destination': 'D',
        'vehicle_id': vehicle_id,
        'driver_id': driver_id,
        'cargo_weight': 100,
        'planned_distance': 10,
        'revenue': 100,
    }, expected_status=201)['data']
    cancel_id = cancel_trip['trip_id']
    post_with_auth(f'/api/v1/trips/{cancel_id}/cancel', {})
    trips = get_with_auth('/api/v1/trips')['data']
    cancelled = [t for t in trips if t['id'] == cancel_id]
    assert cancelled and cancelled[0]['status'] == 'cancelled', 'Cancelled trip did not update'

    return trip_id, cancel_id


def test_maintenance(vehicle_id):
    print('Testing maintenance...')
    log = post_with_auth('/api/v1/maintenance', {
        'vehicle_id': vehicle_id,
        'date': date.today().isoformat(),
        'description': 'HTTP maintenance',
        'maintenance_type': 'corrective',
        'cost': 120,
    }, expected_status=201)['data']
    log_id = log['id']

    maintenance = get_with_auth('/api/v1/maintenance')['data']
    assert any(m['id'] == log_id and m['status'] == 'active' for m in maintenance), 'Maintenance log missing or inactive'

    post_with_auth(f'/api/v1/maintenance/{log_id}/close', {})
    maintenance = get_with_auth('/api/v1/maintenance')['data']
    assert any(m['id'] == log_id and m['status'] == 'closed' for m in maintenance), 'Maintenance close failed'

    return log_id


def test_fuel_and_expenses(vehicle_id):
    print('Testing fuel logs and expenses...')
    fuel = post_with_auth('/api/v1/fuel-logs', {
        'vehicle_id': vehicle_id,
        'date': date.today().isoformat(),
        'liters': 40,
        'cost': 80,
        'odometer_at_fill': 300,
    }, expected_status=201)['data']
    exp = post_with_auth('/api/v1/expenses', {
        'vehicle_id': vehicle_id,
        'date': date.today().isoformat(),
        'category': 'fuel',
        'amount': 80,
        'description': 'Fuel fill',
    }, expected_status=201)['data']

    fuel_data = get_with_auth('/api/v1/fuel-logs')['data']
    expense_data = get_with_auth('/api/v1/expenses')['data']
    assert any(f['id'] == fuel['id'] for f in fuel_data), 'Fuel log missing'
    assert any(e['id'] == exp['id'] for e in expense_data), 'Expense missing'

    return fuel['id'], exp['id']


def test_dashboard():
    print('Testing dashboard...')
    kpi = get_with_auth('/api/v1/dashboard/kpi')['data']
    assert 'total_vehicles' in kpi, 'Missing KPI data'
    charts = get_with_auth('/api/v1/dashboard/charts')['data']
    assert 'vehicle_status_distribution' in charts, 'Missing chart data'
    health = get_with_auth('/api/v1/intelligence/fleet-health')['data']
    assert 'score' in health, 'Missing fleet health score'

    return kpi, charts, health


def verify_cors():
    r = s.options(f'{BASE_URL}/api/v1/vehicles', headers={'Origin': 'http://localhost:4173'}, timeout=10)
    assert r.status_code == 204, f'Preflight failed: {r.status_code}'
    assert r.headers.get('Access-Control-Allow-Origin') == '*', 'CORS allow origin missing'
    assert 'Access-Control-Allow-Methods' in r.headers, 'CORS allow methods missing'


def main():
    print('Starting HTTP integration smoke tests...')
    check_frontend()
    check_backend()
    auth_data = auth_flow()
    verify_cors()
    vehicle_id = test_vehicles()
    expired_driver_id, driver_id = test_drivers()
    trip_id, cancel_id = test_trip_workflow(vehicle_id, driver_id, expired_driver_id)
    log_id = test_maintenance(vehicle_id)
    fuel_id, exp_id = test_fuel_and_expenses(vehicle_id)
    kpi, charts, health = test_dashboard()
    print('All HTTP integration tests passed successfully')
    print('Summary:')
    print(f'  auth_user={auth_data["name"]}')
    print(f'  vehicle_id={vehicle_id} driver_id={driver_id} expired_driver_id={expired_driver_id}')
    print(f'  trip_id={trip_id} cancel_id={cancel_id} maintenance_id={log_id}')
    print(f'  fuel_id={fuel_id} expense_id={exp_id}')
    print(f'  kpi_total_vehicles={kpi["total_vehicles"]}')
    print(f'  fleet_health_score={health["score"]}')

if __name__ == '__main__':
    main()
