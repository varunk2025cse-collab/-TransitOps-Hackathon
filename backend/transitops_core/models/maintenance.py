from odoo import models, fields, api
from odoo.exceptions import ValidationError


class Maintenance(models.Model):
    _name = 'transitops.maintenance'
    _description = 'TransitOps Maintenance Log'

    vehicle_id = fields.Many2one(
        'transitops.vehicle', string='Vehicle', required=True,
    )
    date = fields.Date(string='Date', required=True, default=fields.Date.today)
    description = fields.Text(string='Description', required=True)
    maintenance_type = fields.Selection([
        ('preventive', 'Preventive'),
        ('corrective', 'Corrective'),
        ('emergency', 'Emergency'),
    ], string='Type', default='corrective', required=True)
    cost = fields.Float(string='Cost')
    status = fields.Selection([
        ('active', 'Active'),
        ('closed', 'Closed'),
    ], string='Status', default='active', required=True)

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for rec in records:
            vehicle = rec.vehicle_id
            if vehicle.status == 'on_trip':
                raise ValidationError(
                    f'Cannot schedule maintenance for {vehicle.name}: '
                    f'vehicle is currently On Trip.'
                )
            if vehicle.status == 'retired':
                raise ValidationError(
                    f'Cannot schedule maintenance for {vehicle.name}: '
                    f'vehicle is retired.'
                )
            vehicle.write({'status': 'in_shop'})
        return records

    def action_close(self):
        """Close the maintenance log and release the vehicle."""
        for rec in self:
            if rec.status != 'active':
                raise ValidationError('Only active maintenance logs can be closed.')
            vehicle = rec.vehicle_id
            if vehicle.status == 'retired':
                raise ValidationError(
                    f'Cannot release {vehicle.name}: vehicle is retired.'
                )
            vehicle.write({'status': 'available'})
            rec.write({'status': 'closed'})
