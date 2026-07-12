from odoo import models, fields


class FuelLog(models.Model):
    _name = 'transitops.fuel.log'
    _description = 'TransitOps Fuel Log'

    vehicle_id = fields.Many2one(
        'transitops.vehicle', string='Vehicle', required=True,
    )
    trip_id = fields.Many2one(
        'transitops.trip', string='Related Trip',
    )
    date = fields.Date(string='Date', required=True, default=fields.Date.today)
    liters = fields.Float(string='Liters', required=True)
    cost = fields.Float(string='Cost', required=True)
    odometer_at_fill = fields.Float(string='Odometer at Fill')
    notes = fields.Text(string='Notes')
