from odoo.tests.common import TransactionCase
from odoo.exceptions import ValidationError

class TestTransitOpsDispatch(TransactionCase):

    def setUp(self):
        super(TestTransitOpsDispatch, self).setUp()
        self.Vehicle = self.env['transitops.vehicle']
        self.Driver = self.env['transitops.driver']
        self.Trip = self.env['transitops.trip']

        # Setup dummy data
        self.vehicle1 = self.Vehicle.create({
            'name': 'Test Van',
            'registration_number': 'TEST-01',
            'vehicle_type': 'van',
            'max_capacity': 500,
        })
        
        self.driver1 = self.Driver.create({
            'name': 'Test Driver',
            'license_number': 'LIC-01',
            'license_expiry': '2099-12-31',
        })

    def test_01_dispatch_valid_trip(self):
        """Test that a valid trip locks the assets."""
        trip = self.Trip.create({
            'source': 'A',
            'destination': 'B',
            'vehicle_id': self.vehicle1.id,
            'driver_id': self.driver1.id,
            'cargo_weight': 400, # Under capacity
        })
        
        # Action dispatch
        trip.action_dispatch()
        
        # Verify state changes
        self.assertEqual(trip.status, 'dispatched')
        self.assertEqual(self.vehicle1.status, 'on_trip')
        self.assertEqual(self.driver1.status, 'on_trip')

    def test_02_dispatch_overweight_trip(self):
        """Test that an overweight trip raises an error on creation."""
        with self.assertRaises(ValidationError):
            self.Trip.create({
                'source': 'A',
                'destination': 'B',
                'vehicle_id': self.vehicle1.id,
                'driver_id': self.driver1.id,
                'cargo_weight': 600, # Over capacity (500)
            })
