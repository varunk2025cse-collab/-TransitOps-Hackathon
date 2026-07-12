from odoo import models, fields, api
from odoo.exceptions import ValidationError


class Trip(models.Model):
    _name = 'transitops.trip'
    _description = 'TransitOps Trip'

    name = fields.Char(
        string='Trip Reference',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: 'New',
    )
    source = fields.Char(string='Source Location', required=True)
    destination = fields.Char(string='Destination', required=True)
    vehicle_id = fields.Many2one(
        'transitops.vehicle', string='Vehicle', required=True,
    )
    driver_id = fields.Many2one(
        'transitops.driver', string='Driver', required=True,
    )
    cargo_weight = fields.Float(string='Cargo Weight (kg)', required=True)
    planned_distance = fields.Float(string='Planned Distance (km)')
    actual_distance = fields.Float(string='Actual Distance (km)')
    revenue = fields.Float(string='Revenue Generated')
    start_odometer = fields.Float(string='Start Odometer')
    end_odometer = fields.Float(string='End Odometer')
    scheduled_date = fields.Datetime(string='Scheduled Date')
    completion_date = fields.Datetime(string='Completion Date')
    notes = fields.Text(string='Notes')
    status = fields.Selection([
        ('draft', 'Draft'),
        ('dispatched', 'Dispatched'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], string='Status', default='draft', required=True)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code(
                    'transitops.trip'
                ) or 'New'
        return super().create(vals_list)

    # ── Core Business Rule: Cargo Weight Validation ──────────────────────
    @api.constrains('cargo_weight', 'vehicle_id')
    def _check_cargo_weight(self):
        for rec in self:
            if rec.vehicle_id and rec.cargo_weight > rec.vehicle_id.max_capacity:
                raise ValidationError(
                    f'Cargo weight ({rec.cargo_weight} kg) exceeds the '
                    f'maximum capacity of {rec.vehicle_id.name} '
                    f'({rec.vehicle_id.max_capacity} kg).'
                )

    @api.constrains('end_odometer', 'start_odometer')
    def _check_odometer(self):
        for rec in self:
            if rec.end_odometer and rec.start_odometer:
                if rec.end_odometer < rec.start_odometer:
                    raise ValidationError(
                        'End odometer reading cannot be less than start odometer.'
                    )

    # ── State Transitions ────────────────────────────────────────────────
    def action_dispatch(self):
        """Draft -> Dispatched. Lock vehicle and driver."""
        for rec in self:
            if rec.status != 'draft':
                raise ValidationError('Only draft trips can be dispatched.')

            # Validate vehicle dispatchability
            vehicle = rec.vehicle_id
            if vehicle.status != 'available':
                raise ValidationError(
                    f'Vehicle {vehicle.name} is currently {vehicle.status} '
                    f'and cannot be dispatched.'
                )

            # Validate driver dispatchability
            ok, msg = rec.driver_id.is_dispatchable()
            if not ok:
                raise ValidationError(msg)

            # Lock assets
            rec.start_odometer = vehicle.odometer
            vehicle.write({'status': 'on_trip'})
            rec.driver_id.write({'status': 'on_trip'})
            rec.write({'status': 'dispatched'})

    def action_complete(self):
        """Dispatched -> Completed. Release vehicle and driver."""
        for rec in self:
            if rec.status != 'dispatched':
                raise ValidationError('Only dispatched trips can be completed.')

            # Update vehicle odometer
            if rec.end_odometer:
                rec.vehicle_id.write({
                    'status': 'available',
                    'odometer': rec.end_odometer,
                })
            else:
                rec.vehicle_id.write({'status': 'available'})

            rec.driver_id.write({'status': 'available'})
            rec.write({
                'status': 'completed',
                'completion_date': fields.Datetime.now(),
                'actual_distance': (rec.end_odometer or 0) - (rec.start_odometer or 0),
            })

    def action_cancel(self):
        """Draft/Dispatched -> Cancelled. Release assets if dispatched."""
        for rec in self:
            if rec.status == 'completed':
                raise ValidationError('Completed trips cannot be cancelled.')
            if rec.status == 'dispatched':
                rec.vehicle_id.write({'status': 'available'})
                rec.driver_id.write({'status': 'available'})
            rec.write({'status': 'cancelled'})
