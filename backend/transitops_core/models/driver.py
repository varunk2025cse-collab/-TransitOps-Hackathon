from odoo import models, fields, api
from datetime import date


class Driver(models.Model):
    _name = 'transitops.driver'
    _description = 'TransitOps Driver'

    name = fields.Char(string='Driver Name', required=True)
    license_number = fields.Char(string='License Number', required=True)
    license_category = fields.Char(string='License Category')
    license_expiry = fields.Date(string='License Expiry Date', required=True)
    contact_number = fields.Char(string='Contact Number')
    email = fields.Char(string='Email')
    safety_score = fields.Integer(string='Safety Score', default=100)
    status = fields.Selection([
        ('available', 'Available'),
        ('on_trip', 'On Trip'),
        ('off_duty', 'Off Duty'),
        ('suspended', 'Suspended'),
    ], string='Status', default='available', required=True)

    is_license_expired = fields.Boolean(
        string='License Expired',
        compute='_compute_license_expired',
        store=True,
    )

    _sql_constraints = [
        ('license_unique', 'unique(license_number)',
         'The driver license number must be unique!'),
        ('safety_score_range', 'CHECK(safety_score >= 0 AND safety_score <= 100)',
         'Safety score must be between 0 and 100!'),
    ]

    @api.depends('license_expiry')
    def _compute_license_expired(self):
        today = date.today()
        for rec in self:
            rec.is_license_expired = rec.license_expiry and rec.license_expiry < today

    def is_dispatchable(self):
        """Check if a driver can be assigned to a trip."""
        self.ensure_one()
        if self.status != 'available':
            return False, f'Driver {self.name} is currently {self.status}.'
        if self.is_license_expired:
            return False, f'Driver {self.name} has an expired license.'
        if self.status == 'suspended':
            return False, f'Driver {self.name} is suspended.'
        return True, ''
