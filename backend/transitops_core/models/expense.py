from odoo import models, fields


class Expense(models.Model):
    _name = 'transitops.expense'
    _description = 'TransitOps Expense'

    vehicle_id = fields.Many2one(
        'transitops.vehicle', string='Vehicle', required=True,
    )
    trip_id = fields.Many2one(
        'transitops.trip', string='Related Trip',
    )
    date = fields.Date(string='Date', required=True, default=fields.Date.today)
    category = fields.Selection([
        ('toll', 'Toll'),
        ('parking', 'Parking'),
        ('fine', 'Fine'),
        ('insurance', 'Insurance'),
        ('other', 'Other'),
    ], string='Category', required=True)
    amount = fields.Float(string='Amount', required=True)
    description = fields.Text(string='Description')
