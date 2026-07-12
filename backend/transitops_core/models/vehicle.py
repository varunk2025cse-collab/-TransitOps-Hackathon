from odoo import models, fields, api

class Vehicle(models.Model):
    _name = 'transitops.vehicle'
    _description = 'TransitOps Vehicle'
    
    name = fields.Char(string='Vehicle Name/Model', required=True)
    registration_number = fields.Char(string='Registration Number', required=True)
    vehicle_type = fields.Selection([
        ('truck', 'Truck'),
        ('van', 'Van'),
        ('car', 'Car')
    ], string='Type', required=True)
    max_capacity = fields.Float(string='Maximum Load Capacity (kg)', required=True)
    odometer = fields.Float(string='Current Odometer', default=0.0)
    acquisition_cost = fields.Float(string='Acquisition Cost')
    status = fields.Selection([
        ('available', 'Available'),
        ('on_trip', 'On Trip'),
        ('in_shop', 'In Shop'),
        ('retired', 'Retired')
    ], string='Status', default='available', required=True)
    
    # Computed fields for Module 11 (Fuel/Expenses) and Module 12 (Dashboard)
    total_operational_cost = fields.Float(string='Total Operational Cost', compute='_compute_operational_metrics', store=True)
    roi = fields.Float(string='Vehicle ROI (%)', compute='_compute_operational_metrics', store=True)
    fuel_efficiency = fields.Float(string='Fuel Efficiency (km/l)', compute='_compute_operational_metrics', store=True)

    _sql_constraints = [
        ('registration_unique', 'unique(registration_number)', 'The vehicle registration number must be unique!')
    ]

    @api.depends('odometer') # Will add dependencies on maintenance and fuel logs in Module 11
    def _compute_operational_metrics(self):
        for record in self:
            # Placeholders for now.
            record.total_operational_cost = 0.0
            record.roi = 0.0
            record.fuel_efficiency = 0.0
